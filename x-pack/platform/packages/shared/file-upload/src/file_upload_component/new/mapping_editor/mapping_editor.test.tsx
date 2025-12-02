/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { MappingEditor } from './mapping_editor';
import { MappingEditorService } from './mapping_editor_service';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

// Mock the dependencies
jest.mock('../../../use_file_upload', () => ({
  useFileUploadContext: () => ({
    fileUploadManager: {
      getMappings: jest.fn(() => ({
        json: {
          properties: {
            field1: { type: 'text' },
            field2: { type: 'keyword' },
          },
        },
      })),
      updateMappings: jest.fn(),
      renamePipelineTargetFields: jest.fn(),
    },
  }),
}));

jest.mock('@kbn/field-utils/src/components/field_select/field_select', () => ({
  FieldSelect: ({ selectedType, onTypeChange }: any) => {
    return (
      // eslint-disable-next-line jsx-a11y/no-onchange
      <select
        data-test-subj="field-type-select"
        value={selectedType || ''}
        onChange={(e) => onTypeChange(e.target.value)}
      >
        <option value="">Select type</option>
        <option value="text">text</option>
        <option value="keyword">keyword</option>
        <option value="long">long</option>
        <option value="double">double</option>
        <option value="boolean">boolean</option>
        <option value="date">date</option>
      </select>
    );
  },
}));

jest.mock('./mapping_editor_service');

const MockMappingEditorService = MappingEditorService as jest.MockedClass<
  typeof MappingEditorService
>;

describe('MappingEditor', () => {
  let mockService: jest.Mocked<MappingEditorService>;
  let setMappingsValid: jest.Mock;

  beforeEach(() => {
    setMappingsValid = jest.fn();

    const mockMappings = [
      {
        name: 'field1',
        originalName: 'field1',
        mappingProperty: { type: 'text' },
        originalMappingProperty: { type: 'text' },
      },
      {
        name: 'field2',
        originalName: 'field2',
        mappingProperty: { type: 'keyword' },
        originalMappingProperty: { type: 'keyword' },
      },
    ];

    mockService = {
      mappings$: new BehaviorSubject(mockMappings).asObservable(),
      mappingsError$: new BehaviorSubject<string | null>(null).asObservable(),
      getMappings: jest.fn(() => mockMappings),
      getMappingsError: jest.fn(() => null),
      updateMapping: jest.fn(),
      destroy: jest.fn(),
    } as any;

    MockMappingEditorService.mockImplementation(() => mockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders field count and mappings correctly', () => {
    render(
      <IntlProvider locale="en">
        <MappingEditor setMappingsValid={setMappingsValid} />
      </IntlProvider>
    );

    expect(screen.getByText(/2 fields found/)).toBeInTheDocument();
    expect(screen.getByText('Field name')).toBeInTheDocument();
    expect(screen.getByText('Field type')).toBeInTheDocument();

    expect(screen.getByDisplayValue('field1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('field2')).toBeInTheDocument();
  });

  it('calls setMappingsValid with true when no error', () => {
    render(
      <IntlProvider locale="en">
        <MappingEditor setMappingsValid={setMappingsValid} />
      </IntlProvider>
    );

    expect(setMappingsValid).toHaveBeenCalledWith(true);
  });

  it('calls setMappingsValid with false when there is an error', () => {
    const errorObj = {
      message: 'Duplicate field names are not allowed',
      errors: [{ index: 0, nameError: true, typeError: false }],
    };
    // @ts-expect-error
    mockService.mappingsError$ = new BehaviorSubject(errorObj).asObservable();
    // @ts-expect-error
    mockService.getMappingsError = jest.fn(() => errorObj);

    render(
      <IntlProvider locale="en">
        <MappingEditor setMappingsValid={setMappingsValid} />
      </IntlProvider>
    );

    expect(setMappingsValid).toHaveBeenCalledWith(false);
    expect(screen.getByText('Duplicate field names are not allowed')).toBeInTheDocument();
  });

  it('updates field name when input changes', () => {
    render(
      <IntlProvider locale="en">
        <MappingEditor setMappingsValid={setMappingsValid} />
      </IntlProvider>
    );

    const fieldInput = screen.getByDisplayValue('field1');
    fireEvent.change(fieldInput, { target: { value: 'newFieldName' } });

    expect(mockService.updateMapping).toHaveBeenCalledWith(0, 'newFieldName', 'text');
  });

  it('updates field type when select changes', () => {
    render(
      <IntlProvider locale="en">
        <MappingEditor setMappingsValid={setMappingsValid} />
      </IntlProvider>
    );

    const fieldSelects = screen.getAllByTestId('field-type-select');
    fireEvent.change(fieldSelects[0], { target: { value: 'keyword' } });

    expect(mockService.updateMapping).toHaveBeenCalledWith(0, 'field1', 'keyword');
  });

  it('displays error message when mappingsError is present', () => {
    const errorObj = {
      message: 'Mapping name and type cannot be blank',
      errors: [{ index: 1, nameError: false, typeError: true }],
    };
    // @ts-expect-error
    mockService.mappingsError$ = new BehaviorSubject(errorObj).asObservable();
    // @ts-expect-error
    mockService.getMappingsError = jest.fn(() => errorObj);

    render(
      <IntlProvider locale="en">
        <MappingEditor setMappingsValid={setMappingsValid} />
      </IntlProvider>
    );

    const errorElement = screen.getByText('Mapping name and type cannot be blank');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveClass('euiText');
  });

  it('does not display error message when mappingsError is null', () => {
    render(
      <IntlProvider locale="en">
        <MappingEditor setMappingsValid={setMappingsValid} />
      </IntlProvider>
    );

    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('destroys service on unmount', () => {
    const { unmount } = render(
      <IntlProvider locale="en">
        <MappingEditor setMappingsValid={setMappingsValid} />
      </IntlProvider>
    );

    unmount();

    expect(mockService.destroy).toHaveBeenCalled();
  });

  it('renders field name placeholders correctly', () => {
    render(
      <IntlProvider locale="en">
        <MappingEditor setMappingsValid={setMappingsValid} />
      </IntlProvider>
    );

    const fieldInputs = screen.getAllByPlaceholderText('Enter field name');
    expect(fieldInputs).toHaveLength(2);
  });

  it('handles empty mappings array', () => {
    mockService.getMappings = jest.fn(() => []);
    mockService.mappings$ = new BehaviorSubject([]).asObservable();

    render(
      <IntlProvider locale="en">
        <MappingEditor setMappingsValid={setMappingsValid} />
      </IntlProvider>
    );

    expect(screen.getByText(/0 fields found/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue('field1')).not.toBeInTheDocument();
  });

  it('updates mappings when observable changes', async () => {
    const mappingsSubject = new BehaviorSubject([
      {
        name: 'initialField',
        originalName: 'initialField',
        mappingProperty: { type: 'text' },
        originalMappingProperty: { type: 'text' },
      },
    ]);

    // @ts-expect-error
    mockService.mappings$ = mappingsSubject.asObservable();
    // @ts-expect-error
    mockService.getMappings = jest.fn(() => mappingsSubject.getValue());

    render(
      <IntlProvider locale="en">
        <MappingEditor setMappingsValid={setMappingsValid} />
      </IntlProvider>
    );

    expect(screen.getByDisplayValue('initialField')).toBeInTheDocument();

    // Update the observable
    const newMappings = [
      {
        name: 'updatedField',
        originalName: 'updatedField',
        mappingProperty: { type: 'keyword' },
        originalMappingProperty: { type: 'keyword' },
      },
    ];

    mappingsSubject.next(newMappings);

    await waitFor(() => {
      expect(screen.getByDisplayValue('updatedField')).toBeInTheDocument();
    });
  });
});
