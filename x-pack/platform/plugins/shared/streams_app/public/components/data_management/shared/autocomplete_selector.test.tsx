/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutocompleteSelector } from './autocomplete_selector';

describe('AutocompleteSelector', () => {
  const mockSuggestions = [
    { name: '@timestamp' },
    { name: 'log.level' },
    { name: 'service.name' },
    { name: 'error.message' },
    { name: 'trace.id' },
    { name: 'kubernetes.pod.name' },
  ];

  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    suggestions: mockSuggestions,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with default configuration', () => {
      render(<AutocompleteSelector {...defaultProps} />);

      expect(screen.getByTestId('streamsAppFieldSelector')).toBeInTheDocument();
    });

    it('renders with custom label and placeholder for target field selection', () => {
      render(
        <AutocompleteSelector
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
      render(<AutocompleteSelector {...defaultProps} helpText={grokHelpText} />);

      expect(screen.getByText(grokHelpText)).toBeInTheDocument();
    });

    it('does not show help text when not provided', () => {
      render(<AutocompleteSelector {...defaultProps} />);

      // Should not have any help text
      expect(screen.queryByText(/select or enter/i)).not.toBeInTheDocument();
    });
  });

  describe('Value and onChange Behavior', () => {
    it('displays the selected field value', () => {
      render(<AutocompleteSelector {...defaultProps} value="log.level" />);

      expect(screen.getByDisplayValue('log.level')).toBeInTheDocument();
    });

    it('calls onChange when selecting a structured log field', async () => {
      const mockOnChange = jest.fn();
      render(<AutocompleteSelector {...defaultProps} onChange={mockOnChange} />);

      const toggleButton = screen.getByTestId('comboBoxToggleListButton');
      await userEvent.click(toggleButton);

      // Wait for dropdown to open and select a field
      const option = await screen.findByText('service.name');
      await userEvent.click(option);

      expect(mockOnChange).toHaveBeenCalledWith('service.name');
    });

    it('allows creating custom field paths for dynamic schemas', async () => {
      const mockOnChange = jest.fn();
      render(<AutocompleteSelector {...defaultProps} onChange={mockOnChange} />);

      const input = screen.getByTestId('comboBoxSearchInput');
      await userEvent.click(input);

      await userEvent.type(input, 'app.request.duration_ms');
      await userEvent.keyboard('{Enter}');

      expect(mockOnChange).toHaveBeenCalledWith('app.request.duration_ms');
    });

    it('switches between different field types for different processors', async () => {
      const mockOnChange = jest.fn();
      render(<AutocompleteSelector {...defaultProps} onChange={mockOnChange} />);

      const toggleButton = screen.getByTestId('comboBoxToggleListButton');
      await userEvent.click(toggleButton);

      // Select timestamp field for time-based processing
      const timestampOption = await screen.findByText('@timestamp');
      await userEvent.click(timestampOption);

      expect(mockOnChange).toHaveBeenCalledWith('@timestamp');
    });
  });

  describe('Field Suggestions', () => {
    it('opens dropdown when clicked', async () => {
      render(<AutocompleteSelector {...defaultProps} />);

      const toggleButton = screen.getByTestId('comboBoxToggleListButton');
      await userEvent.click(toggleButton);

      const input = screen.getByTestId('comboBoxSearchInput');
      expect(input).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Validation States', () => {
    it('shows invalid state when isInvalid is true', () => {
      render(<AutocompleteSelector {...defaultProps} isInvalid error="Field is required" />);

      expect(screen.getByText('Field is required')).toBeInTheDocument();
    });

    it('does not show error when isInvalid is false', () => {
      render(
        <AutocompleteSelector {...defaultProps} isInvalid={false} error="Field is required" />
      );

      expect(screen.queryByText('Field is required')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables the combobox when disabled prop is true', () => {
      render(<AutocompleteSelector {...defaultProps} disabled />);

      const input = screen.getByTestId('comboBoxSearchInput');
      expect(input).toHaveAttribute('disabled');
    });
  });
});
