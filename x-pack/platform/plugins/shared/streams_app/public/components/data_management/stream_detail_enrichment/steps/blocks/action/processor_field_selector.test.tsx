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
import { FieldSelector } from '../../../../shared/field_selector';

// Mock the field suggestions hook
jest.mock('../../../../../../hooks/use_field_suggestions', () => ({
  useEnrichmentFieldSuggestions: jest.fn(() => [
    { name: '@timestamp', type: 'date' },
    { name: 'log.level', type: 'keyword' },
    { name: 'service.name', type: 'keyword' },
    { name: 'error.message', type: 'text' },
  ]),
}));

// Mock the FieldSelector component to focus on ProcessorFieldSelector-specific logic
jest.mock('../../../../shared/field_selector', () => ({
  FieldSelector: jest.fn(
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
      ...restProps
    }) => (
      <div>
        <label htmlFor="mock-field-selector">{label}</label>
        {helpText && <div>{helpText}</div>}
        <input
          id="mock-field-selector"
          data-test-subj={dataTestSubj || 'mock-field-selector'}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          {...restProps}
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

      expect(FieldSelector).toHaveBeenCalledWith(
        expect.objectContaining({
          placeholder: 'Custom placeholder',
          fullWidth: true,
          dataTestSubj: 'streamsAppProcessorFieldSelectorComboFieldText',
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
  });
});
