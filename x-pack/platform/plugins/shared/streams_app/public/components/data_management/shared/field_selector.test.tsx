/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldSelector } from './field_selector';

jest.mock('../stream_detail_enrichment/state_management/stream_enrichment_state_machine', () => ({
  useSimulatorSelector: jest.fn(),
}));

jest.mock('../stream_detail_enrichment/steps/blocks/action/hooks/use_field_suggestions', () => ({
  useFieldSuggestions: jest.fn(),
}));

import { useSimulatorSelector } from '../stream_detail_enrichment/state_management/stream_enrichment_state_machine';
import { useFieldSuggestions } from '../stream_detail_enrichment/steps/blocks/action/hooks/use_field_suggestions';

const mockUseSimulatorSelector = jest.mocked(useSimulatorSelector);
const mockUseFieldSuggestions = jest.mocked(useFieldSuggestions);

describe('FieldSelector', () => {
  // Realistic log field suggestions based on common streaming data patterns
  const mockSuggestions = [
    { label: '@timestamp', value: { name: '@timestamp' } },
    { label: 'log.level', value: { name: 'log.level' } },
    { label: 'service.name', value: { name: 'service.name' } },
    { label: 'error.message', value: { name: 'error.message' } },
    { label: 'trace.id', value: { name: 'trace.id' } },
    { label: 'kubernetes.pod.name', value: { name: 'kubernetes.pod.name' } },
  ];

  const defaultProps = {
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSimulatorSelector.mockReturnValue([]);
    mockUseFieldSuggestions.mockReturnValue(mockSuggestions);
  });

  describe('Basic Rendering', () => {
    it('renders with default configuration', () => {
      render(<FieldSelector {...defaultProps} />);

      expect(screen.getByLabelText('Field')).toBeInTheDocument();
      expect(screen.getByTestId('streamsAppFieldSelector')).toBeInTheDocument();
    });

    it('renders with custom label and placeholder for target field selection', () => {
      render(
        <FieldSelector
          {...defaultProps}
          label="Target field"
          placeholder="Select destination field for processed data..."
        />
      );

      expect(screen.getByLabelText('Target field')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Select destination field for processed data...')
      ).toBeInTheDocument();
    });

    it('shows processor-specific help text when provided', () => {
      const grokHelpText =
        'Select the field containing the raw log message to parse with Grok patterns';
      render(<FieldSelector {...defaultProps} helpText={grokHelpText} />);

      expect(screen.getByText(grokHelpText)).toBeInTheDocument();
    });

    it('does not show help text when not provided', () => {
      render(<FieldSelector {...defaultProps} />);

      // Should not have any help text
      expect(screen.queryByText(/select or enter/i)).not.toBeInTheDocument();
    });
  });

  describe('Value and onChange Behavior', () => {
    it('displays the selected field value', () => {
      render(<FieldSelector {...defaultProps} value="log.level" />);

      expect(screen.getByDisplayValue('log.level')).toBeInTheDocument();
    });

    it('calls onChange when selecting a structured log field', async () => {
      const mockOnChange = jest.fn();
      render(<FieldSelector {...defaultProps} onChange={mockOnChange} />);

      const toggleButton = screen.getByTestId('comboBoxToggleListButton');
      await userEvent.click(toggleButton);

      // Wait for dropdown to open and select a realistic log field
      const option = await screen.findByText('service.name');
      await userEvent.click(option);

      expect(mockOnChange).toHaveBeenCalledWith('service.name');
    });

    it('allows creating custom field paths for dynamic schemas', async () => {
      const mockOnChange = jest.fn();
      render(<FieldSelector {...defaultProps} onChange={mockOnChange} />);

      const input = screen.getByTestId('comboBoxSearchInput');
      await userEvent.click(input);
      // Test realistic custom field that might be created in streaming pipelines
      await userEvent.type(input, 'app.request.duration_ms');
      await userEvent.keyboard('{Enter}');

      expect(mockOnChange).toHaveBeenCalledWith('app.request.duration_ms');
    });

    it('switches between different field types for different processors', async () => {
      const mockOnChange = jest.fn();
      render(<FieldSelector {...defaultProps} onChange={mockOnChange} />);

      const toggleButton = screen.getByTestId('comboBoxToggleListButton');
      await userEvent.click(toggleButton);

      // Select timestamp field for time-based processing
      const timestampOption = await screen.findByText('@timestamp');
      await userEvent.click(timestampOption);

      expect(mockOnChange).toHaveBeenCalledWith('@timestamp');
    });
  });

  describe('Field Suggestions', () => {
    it('passes processorType to useFieldSuggestions', () => {
      render(<FieldSelector {...defaultProps} processorType="grok" />);

      expect(mockUseFieldSuggestions).toHaveBeenCalledWith('grok');
    });

    it('opens dropdown when clicked', async () => {
      render(<FieldSelector {...defaultProps} />);

      const toggleButton = screen.getByTestId('comboBoxToggleListButton');
      await userEvent.click(toggleButton);

      // EuiComboBox should be opened, we can verify by checking aria-expanded
      const input = screen.getByTestId('comboBoxSearchInput');
      expect(input).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Validation States', () => {
    it('shows invalid state when isInvalid is true', () => {
      render(<FieldSelector {...defaultProps} isInvalid error="Field is required" />);

      expect(screen.getByText('Field is required')).toBeInTheDocument();
    });

    it('does not show error when isInvalid is false', () => {
      render(<FieldSelector {...defaultProps} isInvalid={false} error="Field is required" />);

      expect(screen.queryByText('Field is required')).not.toBeInTheDocument();
    });
  });

  describe('Unsupported Fields Warning', () => {
    it('shows warning for problematic dot-separated fields in streaming contexts', () => {
      // Simulate fields that cause issues in streaming pipelines
      mockUseSimulatorSelector.mockReturnValue(['kubernetes.', 'host.', 'service.']);

      render(
        <FieldSelector
          {...defaultProps}
          value="kubernetes.container.name"
          showUnsupportedFieldsWarning
        />
      );

      expect(screen.getByText('Dot-separated field names are not supported.')).toBeInTheDocument();
    });

    it('hides warning when processor does not require field validation', () => {
      mockUseSimulatorSelector.mockReturnValue(['kubernetes.']);

      render(
        <FieldSelector
          {...defaultProps}
          value="kubernetes.pod.uid"
          showUnsupportedFieldsWarning={false}
        />
      );

      expect(
        screen.queryByText('Dot-separated field names are not supported.')
      ).not.toBeInTheDocument();
    });

    it('allows well-structured nested fields without warnings', () => {
      mockUseSimulatorSelector.mockReturnValue(['legacy_field.']);

      render(
        <FieldSelector {...defaultProps} value="error.message" showUnsupportedFieldsWarning />
      );

      expect(
        screen.queryByText('Dot-separated field names are not supported.')
      ).not.toBeInTheDocument();
    });

    it('shows warning for multiple problematic field patterns', () => {
      // Test with multiple unsupported patterns that could cause streaming issues
      mockUseSimulatorSelector.mockReturnValue(['old_system.', 'legacy.', 'deprecated.']);

      render(
        <FieldSelector
          {...defaultProps}
          value="old_system.metric.value"
          showUnsupportedFieldsWarning
        />
      );

      expect(screen.getByText('Dot-separated field names are not supported.')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables the combobox when disabled prop is true', () => {
      render(<FieldSelector {...defaultProps} disabled />);

      const input = screen.getByTestId('comboBoxSearchInput');
      expect(input).toHaveAttribute('disabled');
    });
  });
});
