/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked, MockedClass, MockedFunction } from 'vitest';

import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { BehaviorSubject } from 'rxjs';
import { MappingEditor } from './mapping_editor';
import { MappingEditorService } from './mapping_editor_service';

vi.mock('../../../use_file_upload', () => {
  const mocked = {
    useFileUploadContext: () => ({
      fileUploadManager: {
        getMappings: vi.fn(() => ({
          json: {
            properties: {
              field1: { type: 'text' },
              field2: { type: 'keyword' },
            },
          },
        })),
        updateMappings: vi.fn(),
        renamePipelineTargetFields: vi.fn(),
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/field-utils/src/components/field_select/field_select', () => {
  const mocked = {
    FieldSelect: ({
      selectedType,
      onTypeChange,
    }: {
      selectedType: string | null;
      onTypeChange: (type: string) => void;
    }) => {
      return (
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
  };
  return { ...mocked, default: mocked };
});

vi.mock('./mapping_editor_service');

const MockMappingEditorService = MappingEditorService as MockedClass<typeof MappingEditorService>;

describe('MappingEditor', () => {
  let mockService: Mocked<MappingEditorService>;
  let onImportClick: MockedFunction<() => void>;

  beforeEach(() => {
    onImportClick = vi.fn();

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
      mappingsEdited$: new BehaviorSubject<boolean>(false).asObservable(),
      getMappings: vi.fn(() => mockMappings),
      getMappingsError: vi.fn(() => null),
      getMappingsEdited: vi.fn(() => false),
      updateMapping: vi.fn(),
      reset: vi.fn(),
      destroy: vi.fn(),
    } as Partial<MappingEditorService> as Mocked<MappingEditorService>;

    MockMappingEditorService.mockImplementation(() => mockService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders field count and mappings correctly', () => {
    renderWithI18n(<MappingEditor onImportClick={onImportClick} />);

    expect(screen.getByText(/2 fields found/)).toBeInTheDocument();
    expect(screen.getByText('Field name')).toBeInTheDocument();
    expect(screen.getByText('Field type')).toBeInTheDocument();

    expect(screen.getByDisplayValue('field1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('field2')).toBeInTheDocument();
  });

  it('updates field name when input changes', () => {
    renderWithI18n(<MappingEditor onImportClick={onImportClick} />);

    const fieldInput = screen.getByDisplayValue('field1');
    fireEvent.change(fieldInput, { target: { value: 'newFieldName' } });

    expect(mockService.updateMapping).toHaveBeenCalledWith(0, 'newFieldName', 'text');
  });

  it('updates field type when select changes', () => {
    renderWithI18n(<MappingEditor onImportClick={onImportClick} />);

    const fieldSelects = screen.getAllByTestId('field-type-select');
    fireEvent.change(fieldSelects[0], { target: { value: 'keyword' } });

    expect(mockService.updateMapping).toHaveBeenCalledWith(0, 'field1', 'keyword');
  });

  it('displays error message when mappingsError is present', () => {
    const errorObj = {
      message: 'Mapping name and type cannot be blank',
      errors: [{ index: 1, nameError: false, typeError: true }],
    };
    (mockService.mappingsError$ as any) = new BehaviorSubject(errorObj).asObservable();
    (mockService.getMappingsError as Mock).mockReturnValue(errorObj);

    renderWithI18n(<MappingEditor onImportClick={onImportClick} />);

    const errorElement = screen.getByText('Mapping name and type cannot be blank');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveClass('euiText');
  });

  it('does not display error message when mappingsError is null', () => {
    renderWithI18n(<MappingEditor onImportClick={onImportClick} />);

    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('renders field name placeholders correctly', () => {
    renderWithI18n(<MappingEditor onImportClick={onImportClick} />);

    const fieldInputs = screen.getAllByPlaceholderText('Enter field name');
    expect(fieldInputs).toHaveLength(2);
  });

  it('handles empty mappings array', () => {
    mockService.getMappings = vi.fn(() => []);
    mockService.mappings$ = new BehaviorSubject([]).asObservable();

    renderWithI18n(<MappingEditor onImportClick={onImportClick} />);

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

    (mockService.mappings$ as any) = mappingsSubject.asObservable();
    (mockService.getMappings as Mock).mockImplementation(() => mappingsSubject.getValue());

    renderWithI18n(<MappingEditor onImportClick={onImportClick} />);

    expect(screen.getByDisplayValue('initialField')).toBeInTheDocument();

    const newMappings = [
      {
        name: 'updatedField',
        originalName: 'updatedField',
        mappingProperty: { type: 'keyword' },
        originalMappingProperty: { type: 'keyword' },
      },
    ];

    act(() => {
      mappingsSubject.next(newMappings);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('updatedField')).toBeInTheDocument();
    });
  });

  it('renders reset button and calls reset method when clicked', async () => {
    const mappingsEditedSubject = new BehaviorSubject(true);
    (mockService.mappingsEdited$ as any) = mappingsEditedSubject.asObservable();
    (mockService.getMappingsEdited as Mock).mockReturnValue(true);

    renderWithI18n(<MappingEditor onImportClick={onImportClick} />);

    const resetButton = screen.getByRole('button', { name: 'Reset to default' });
    expect(resetButton).toBeInTheDocument();

    expect(resetButton).toBeEnabled();

    fireEvent.click(resetButton);

    expect(mockService.reset).toHaveBeenCalledTimes(1);
  });

  it('disables reset button when mappings are not edited', () => {
    const mappingsEditedSubject = new BehaviorSubject(false);
    (mockService.mappingsEdited$ as any) = mappingsEditedSubject.asObservable();
    (mockService.getMappingsEdited as Mock).mockReturnValue(false);

    renderWithI18n(<MappingEditor onImportClick={onImportClick} />);

    const resetButton = screen.getByRole('button', { name: 'Reset to default' });
    expect(resetButton).toBeInTheDocument();

    expect(resetButton).toBeDisabled();

    fireEvent.click(resetButton);
    expect(mockService.reset).not.toHaveBeenCalled();
  });

  it('resets fields to initial values when reset button is clicked after editing', async () => {
    const initialMappings = [
      {
        name: 'originalField1',
        originalName: 'originalField1',
        mappingProperty: { type: 'text' },
        originalMappingProperty: { type: 'text' },
      },
      {
        name: 'originalField2',
        originalName: 'originalField2',
        mappingProperty: { type: 'keyword' },
        originalMappingProperty: { type: 'keyword' },
      },
    ];

    const mappingsSubject = new BehaviorSubject(initialMappings);
    const mappingsEditedSubject = new BehaviorSubject(false);

    (mockService.mappings$ as any) = mappingsSubject.asObservable();
    (mockService.mappingsEdited$ as any) = mappingsEditedSubject.asObservable();
    (mockService.getMappings as Mock).mockImplementation(() => mappingsSubject.getValue());
    (mockService.getMappingsEdited as Mock).mockImplementation(() =>
      mappingsEditedSubject.getValue()
    );

    renderWithI18n(<MappingEditor onImportClick={onImportClick} />);

    expect(screen.getByDisplayValue('originalField1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('originalField2')).toBeInTheDocument();

    const firstFieldInput = screen.getByDisplayValue('originalField1');
    fireEvent.change(firstFieldInput, { target: { value: 'editedField1' } });

    const editedMappings = [
      {
        name: 'editedField1',
        originalName: 'originalField1',
        mappingProperty: { type: 'text' },
        originalMappingProperty: { type: 'text' },
      },
      {
        name: 'originalField2',
        originalName: 'originalField2',
        mappingProperty: { type: 'keyword' },
        originalMappingProperty: { type: 'keyword' },
      },
    ];

    act(() => {
      mappingsSubject.next(editedMappings);
      mappingsEditedSubject.next(true);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('editedField1')).toBeInTheDocument();
    });

    const resetButton = screen.getByRole('button', { name: 'Reset to default' });
    expect(resetButton).toBeEnabled();

    (mockService.reset as Mock).mockImplementation(() => {
      mappingsSubject.next(initialMappings);
      mappingsEditedSubject.next(false);
    });

    fireEvent.click(resetButton);

    expect(mockService.reset).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByDisplayValue('originalField1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('originalField2')).toBeInTheDocument();
    });

    expect(screen.queryByDisplayValue('editedField1')).not.toBeInTheDocument();

    expect(resetButton).toBeDisabled();
  });
});
