/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { parse } from 'yaml';
import { monaco } from '@kbn/monaco';
import {
  useFieldNameValidation,
  collectFieldNames,
  createDuplicateFieldMarkers,
} from './use_field_name_validation';

jest.mock('@kbn/monaco', () => ({
  monaco: {
    editor: {
      setModelMarkers: jest.fn(),
      MarkerSeverity: {
        Error: 8,
        Warning: 4,
      },
    },
  },
}));

const mockSetModelMarkers = monaco.editor.setModelMarkers as jest.Mock;

describe('collectFieldNames', () => {
  it('should collect field names and positions', () => {
    const yaml = `name: Test Template
fields:
  - name: field1
    control: INPUT_TEXT
    type: keyword
  - name: field2
    control: INPUT_TEXT
    type: keyword`;

    const parsed = parse(yaml);
    const fieldInfos = collectFieldNames(yaml, parsed.fields);

    expect(fieldInfos).toHaveLength(2);
    expect(fieldInfos[0].name).toBe('field1');
    expect(fieldInfos[1].name).toBe('field2');
  });

  it('should collect duplicate field names', () => {
    const yaml = `name: Test Template
fields:
  - name: duplicateField
    control: INPUT_TEXT
    type: keyword
  - name: duplicateField
    control: INPUT_TEXT
    type: keyword`;

    const parsed = parse(yaml);
    const fieldInfos = collectFieldNames(yaml, parsed.fields);

    expect(fieldInfos).toHaveLength(2);
    expect(fieldInfos[0].name).toBe('duplicateField');
    expect(fieldInfos[1].name).toBe('duplicateField');
  });
});

describe('createDuplicateFieldMarkers', () => {
  it('should create markers for duplicate field names', () => {
    const fieldInfos = [
      {
        name: 'duplicateField',
        startLineNumber: 3,
        startColumn: 11,
        endLineNumber: 3,
        endColumn: 25,
      },
      {
        name: 'duplicateField',
        startLineNumber: 6,
        startColumn: 11,
        endLineNumber: 6,
        endColumn: 25,
      },
    ];

    const markers = createDuplicateFieldMarkers(fieldInfos);

    expect(markers).toHaveLength(2);
    expect(markers[0]).toMatchObject({
      severity: 8,
      message: 'Field name "duplicateField" is not unique. Found 2 fields with this name.',
      source: 'field-name-validation',
    });
  });

  it('should not create markers when field names are unique', () => {
    const fieldInfos = [
      {
        name: 'field1',
        startLineNumber: 3,
        startColumn: 11,
        endLineNumber: 3,
        endColumn: 17,
      },
      {
        name: 'field2',
        startLineNumber: 6,
        startColumn: 11,
        endLineNumber: 6,
        endColumn: 17,
      },
    ];

    const markers = createDuplicateFieldMarkers(fieldInfos);

    expect(markers).toHaveLength(0);
  });
});

describe('useFieldNameValidation', () => {
  let mockEditor: jest.Mocked<monaco.editor.IStandaloneCodeEditor>;
  let mockModel: jest.Mocked<monaco.editor.ITextModel>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockModel = {
      uri: { toString: () => 'test-uri' },
      isDisposed: jest.fn(() => false),
    } as unknown as jest.Mocked<monaco.editor.ITextModel>;

    mockEditor = {
      getModel: jest.fn(() => mockModel),
    } as unknown as jest.Mocked<monaco.editor.IStandaloneCodeEditor>;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not set markers when editor is null', () => {
    renderHook(() => useFieldNameValidation(null, 'name: test'));

    jest.runAllTimers();

    expect(mockSetModelMarkers).not.toHaveBeenCalled();
  });

  it('should clear markers when no fields are present', () => {
    const yaml = 'name: Test Template\ndescription: Test';

    renderHook(() => useFieldNameValidation(mockEditor, yaml));

    jest.runAllTimers();

    expect(mockSetModelMarkers).toHaveBeenCalledWith(mockModel, 'field-name-validation', []);
  });

  it('should not set markers when field names are unique', () => {
    const yaml = `name: Test Template
fields:
  - name: field1
    control: INPUT_TEXT
    type: keyword
  - name: field2
    control: INPUT_TEXT
    type: keyword`;

    renderHook(() => useFieldNameValidation(mockEditor, yaml));

    jest.runAllTimers();

    expect(mockSetModelMarkers).toHaveBeenCalledWith(mockModel, 'field-name-validation', []);
  });

  it('should set error markers when field names are duplicated', () => {
    const yaml = `name: Test Template
fields:
  - name: duplicateField
    control: INPUT_TEXT
    type: keyword
  - name: duplicateField
    control: INPUT_TEXT
    type: keyword`;

    renderHook(() => useFieldNameValidation(mockEditor, yaml));

    jest.runAllTimers();

    expect(mockSetModelMarkers).toHaveBeenCalled();
    const markers = mockSetModelMarkers.mock.calls[0][2];

    expect(markers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 8,
          message: expect.stringContaining('duplicateField'),
          source: 'field-name-validation',
        }),
      ])
    );
    expect(markers.length).toBe(2);
  });

  it('should set error markers for multiple duplicate field names', () => {
    const yaml = `name: Test Template
fields:
  - name: field1
    control: INPUT_TEXT
    type: keyword
  - name: field1
    control: INPUT_TEXT
    type: keyword
  - name: field2
    control: INPUT_TEXT
    type: keyword
  - name: field2
    control: INPUT_TEXT
    type: keyword`;

    renderHook(() => useFieldNameValidation(mockEditor, yaml));

    jest.runAllTimers();

    const markers = mockSetModelMarkers.mock.calls[0][2];
    expect(markers).toHaveLength(4);
    expect(markers[0].message).toContain('field1');
    expect(markers[2].message).toContain('field2');
  });

  it('should debounce validation calls', () => {
    const yaml = 'name: Test';
    const { rerender } = renderHook(({ value }) => useFieldNameValidation(mockEditor, value), {
      initialProps: { value: yaml },
    });

    rerender({ value: 'name: Test2' });
    rerender({ value: 'name: Test3' });

    expect(mockSetModelMarkers).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(mockSetModelMarkers).toHaveBeenCalledTimes(1);
  });

  it('should clear markers on invalid YAML', () => {
    const invalidYaml = 'name: [invalid yaml structure';

    renderHook(() => useFieldNameValidation(mockEditor, invalidYaml));

    jest.runAllTimers();

    expect(mockSetModelMarkers).toHaveBeenCalledWith(mockModel, 'field-name-validation', []);
  });

  it('should handle fields without name property', () => {
    const yaml = `name: Test Template
fields:
  - control: INPUT_TEXT
    type: keyword
  - name: validField
    control: INPUT_TEXT
    type: keyword`;

    renderHook(() => useFieldNameValidation(mockEditor, yaml));

    jest.runAllTimers();

    expect(mockSetModelMarkers).toHaveBeenCalledWith(mockModel, 'field-name-validation', []);
  });
});
