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

jest.mock('../../../state_management/stream_enrichment_state_machine', () => ({
  useSimulatorSelector: jest.fn(),
}));

jest.mock('./hooks/use_field_suggestions', () => ({
  useFieldSuggestions: jest.fn(),
}));

import { useSimulatorSelector } from '../../../state_management/stream_enrichment_state_machine';
import { useFieldSuggestions } from './hooks/use_field_suggestions';

const mockUseSimulatorSelector = jest.mocked(useSimulatorSelector);
const mockUseFieldSuggestions = jest.mocked(useFieldSuggestions);

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
  const mockSuggestions = [
    { label: 'message', value: { name: 'message' } },
    { label: 'host.name', value: { name: 'host.name' } },
  ];

  beforeEach(() => {
    mockUseSimulatorSelector.mockReturnValue([]);
    mockUseFieldSuggestions.mockReturnValue(mockSuggestions);
  });

  it('renders with default configuration', () => {
    renderComponent();

    expect(screen.getByLabelText('Source field')).toBeInTheDocument();
    expect(
      screen.getByTestId('streamsAppProcessorFieldSelectorComboFieldText')
    ).toBeInTheDocument();
  });

  it('accepts custom labels and help text', () => {
    renderComponent({
      label: 'Target Field',
      helpText: 'Choose your target',
    });

    expect(screen.getByLabelText('Target Field')).toBeInTheDocument();
    expect(screen.getByText('Choose your target')).toBeInTheDocument();
  });

  it('displays selected field value', () => {
    renderComponent({}, { from: 'message' });

    const input = screen.getByDisplayValue('message');
    expect(input).toBeInTheDocument();
  });

  it('calls useFieldSuggestions with processor type', () => {
    renderComponent({ processorType: 'grok' });

    expect(mockUseFieldSuggestions).toHaveBeenCalledWith('grok');
  });

  it('allows creating custom field values not in suggestions', async () => {
    const mockOnChange = jest.fn();
    renderComponent({ onChange: mockOnChange });

    const input = screen.getByTestId('comboBoxSearchInput');

    await userEvent.click(input);
    await userEvent.type(input, 'custom_field');
    await userEvent.keyboard('{Enter}');

    // Verify the custom field was created and onChange was called
    expect(mockOnChange).toHaveBeenCalledWith('custom_field');
  });
});
