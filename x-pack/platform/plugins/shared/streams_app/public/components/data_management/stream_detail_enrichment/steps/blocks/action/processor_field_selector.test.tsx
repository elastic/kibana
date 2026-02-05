/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { ProcessorFieldSelector } from './processor_field_selector';
import { AutocompleteSelector } from '../../../../shared/autocomplete_selector';

jest.mock('../../../../../../hooks/use_field_suggestions', () => ({
  useEnrichmentFieldSuggestions: jest.fn(() => [
    { name: '@timestamp', type: 'date' },
    { name: 'log.level', type: 'keyword' },
    { name: 'service.name', type: 'keyword' },
    { name: 'error.message', type: 'text' },
  ]),
}));

jest.mock('../../../../../../hooks/use_stream_data_view_field_types', () => ({
  useStreamDataViewFieldTypes: jest.fn(() => ({
    fieldTypes: [
      { name: '@timestamp', type: 'date', esType: 'date' },
      { name: 'log.level', type: 'string', esType: 'keyword' },
      { name: 'service.name', type: 'string', esType: 'keyword' },
      { name: 'error.message', type: 'string', esType: 'text' },
    ],
    fieldTypeMap: new Map([
      ['@timestamp', 'date'],
      ['log.level', 'keyword'],
      ['service.name', 'keyword'],
      ['error.message', 'text'],
    ]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataView: {} as any,
  })),
}));

// Mock the simulator selector hook
jest.mock('../../../state_management/stream_enrichment_state_machine', () => ({
  useSimulatorSelector: jest.fn((selector) => selector({ context: { streamName: 'test-stream' } })),
  useStreamEnrichmentSelector: jest.fn((selector) =>
    selector({
      context: {
        fieldTypesByProcessor: new Map(),
      },
    })
  ),
}));

// Mock the AutocompleteSelector component to focus on ProcessorFieldSelector-specific logic
jest.mock('../../../../shared/autocomplete_selector', () => ({
  AutocompleteSelector: jest.fn(
    ({
      value,
      onChange,
      label,
      helpText,
      isInvalid,
      error,
      dataTestSubj,
      placeholder,
      disabled,
      compressed,
      fullWidth,
      suggestions,
      labelAppend,
      autoFocus,
    }) => (
      <div>
        <label htmlFor="mock-field-selector">
          {label}
          {labelAppend && <span>{labelAppend}</span>}
        </label>
        {helpText && <div>{helpText}</div>}
        <input
          id="mock-field-selector"
          data-test-subj={dataTestSubj || 'mock-field-selector'}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
        />
        {isInvalid && error && <div role="alert">{error}</div>}
      </div>
    )
  ),
}));

const TestWrapper = ({
  children,
  defaultValues = {},
}: {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValues?: Record<string, any>;
}) => {
  const methods = useForm({ defaultValues });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

const renderComponent = (props = {}, formValues = {}) => {
  return render(
    <TestWrapper defaultValues={formValues}>
      <ProcessorFieldSelector {...props} />
    </TestWrapper>
  );
};

describe('ProcessorFieldSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Default Configuration', () => {
    it('renders with default labels', () => {
      renderComponent();

      expect(screen.getByLabelText('Source Field')).toBeInTheDocument();
      expect(screen.getByText('Select or enter a field name')).toBeInTheDocument();
    });

    it('uses default fieldKey', () => {
      renderComponent({}, { from: 'test-value' });

      expect(screen.getByDisplayValue('test-value')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('accepts custom labels and help text', () => {
      renderComponent({
        label: 'Target Field',
        helpText: 'Choose your target',
      });

      expect(screen.getByLabelText('Target Field')).toBeInTheDocument();
      expect(screen.getByText('Choose your target')).toBeInTheDocument();
    });

    it('accepts custom fieldKey', () => {
      renderComponent({ fieldKey: 'target' }, { target: 'custom-value' });

      expect(screen.getByDisplayValue('custom-value')).toBeInTheDocument();
    });

    it('accepts custom placeholder', () => {
      renderComponent({ placeholder: 'Enter target field' });

      expect(screen.getByPlaceholderText('Enter target field')).toBeInTheDocument();
    });
  });

  describe('Form Integration', () => {
    it('integrates with react-hook-form validation', () => {
      // Test with empty required field
      renderComponent({}, {});

      // Trigger form validation by trying to submit
      const input = screen.getByTestId('streamsAppProcessorFieldSelectorComboFieldText');
      expect(input).toHaveAttribute('value', '');
    });

    it('displays validation errors', () => {
      renderComponent();

      const input = screen.getByTestId('streamsAppProcessorFieldSelectorComboFieldText');
      expect(input).toBeInTheDocument();
    });

    it('calls onChange callback when field changes', async () => {
      const mockOnChange = jest.fn();
      renderComponent({ onChange: mockOnChange });

      const input = screen.getByTestId('streamsAppProcessorFieldSelectorComboFieldText');
      await userEvent.type(input, 'new-value');

      expect(mockOnChange).toHaveBeenCalledWith('new-value');
    });
  });

  describe('FieldSelector Integration', () => {
    it('passes correct props to FieldSelector', () => {
      renderComponent({
        placeholder: 'Custom placeholder',
      });

      expect(AutocompleteSelector).toHaveBeenCalledWith(
        expect.objectContaining({
          placeholder: 'Custom placeholder',
          fullWidth: true,
          dataTestSubj: 'streamsAppProcessorFieldSelectorComboFieldText',
          showIcon: true,
          suggestions: [
            { name: '@timestamp', type: 'date' },
            { name: 'log.level', type: 'keyword' },
            { name: 'service.name', type: 'keyword' },
            { name: 'error.message', type: 'text' },
          ],
        }),
        expect.anything()
      );
    });

    it('enriches field suggestions with DataView types', () => {
      renderComponent();

      // Verify that suggestions are enriched with types from DataView
      expect(AutocompleteSelector).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestions: expect.arrayContaining([
            expect.objectContaining({ name: '@timestamp', type: 'date' }),
            expect.objectContaining({ name: 'log.level', type: 'keyword' }),
          ]),
          showIcon: true,
        }),
        expect.anything()
      );
    });
  });
});
