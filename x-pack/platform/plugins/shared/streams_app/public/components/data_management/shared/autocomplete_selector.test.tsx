/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EuiComboBoxProps } from '@elastic/eui';
import { AutocompleteSelector } from './autocomplete_selector';

jest.mock('@kbn/react-field', () => ({
  FieldIcon: ({ type }: { type: string }) => <span data-test-subj={`field-icon-${type}`} />,
}));

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

      expect(screen.getByTestId('streamsAppAutocompleteSelector')).toBeInTheDocument();
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

  describe('Field Type Icons', () => {
    it('renders field type icons when showIcon is true and suggestions include type information', async () => {
      const suggestionsWithTypes = [
        { name: '@timestamp', type: 'date', icon: true },
        { name: 'log.level', type: 'keyword', icon: true },
        { name: 'message', type: 'text', icon: true },
      ];

      render(
        <AutocompleteSelector
          {...defaultProps}
          suggestions={suggestionsWithTypes}
          showIcon={true}
        />
      );

      const toggleButton = screen.getByTestId('comboBoxToggleListButton');
      await userEvent.click(toggleButton);

      // Verify that field icons are rendered for fields with types
      expect(screen.getByTestId('field-icon-date')).toBeInTheDocument();
      expect(screen.getByTestId('field-icon-keyword')).toBeInTheDocument();
      expect(screen.getByTestId('field-icon-text')).toBeInTheDocument();
    });

    it('renders unknown icons for fields without type information', async () => {
      const suggestionsWithoutTypes = [
        { name: '@timestamp', icon: true },
        { name: 'log.level', icon: true },
      ];

      render(
        <AutocompleteSelector
          {...defaultProps}
          suggestions={suggestionsWithoutTypes}
          showIcon={true}
        />
      );

      const toggleButton = screen.getByTestId('comboBoxToggleListButton');
      await userEvent.click(toggleButton);

      // Verify that unknown field icons are rendered for fields without types
      expect(screen.getAllByTestId('field-icon-unknown')).toHaveLength(2);
    });

    it('does not render icons when showIcon is false', async () => {
      const suggestionsWithTypes = [
        { name: '@timestamp', type: 'date' },
        { name: 'log.level', type: 'keyword' },
      ];

      render(
        <AutocompleteSelector
          {...defaultProps}
          suggestions={suggestionsWithTypes}
          showIcon={false}
        />
      );

      const toggleButton = screen.getByTestId('comboBoxToggleListButton');
      await userEvent.click(toggleButton);

      // Verify that no icons are rendered
      expect(screen.queryByTestId('field-icon-date')).not.toBeInTheDocument();
      expect(screen.queryByTestId('field-icon-keyword')).not.toBeInTheDocument();
    });

    it('does not show icon for selected value (icons only in dropdown)', () => {
      const suggestionsWithTypes = [
        { name: 'log.level', type: 'keyword', icon: true },
        { name: 'message', type: 'text', icon: true },
      ];

      render(
        <AutocompleteSelector
          {...defaultProps}
          value="log.level"
          suggestions={suggestionsWithTypes}
          showIcon={true}
        />
      );

      // Selected value should not have icon (only dropdown options have icons)
      expect(screen.queryByTestId('field-icon-keyword')).not.toBeInTheDocument();
      expect(screen.queryByTestId('field-icon-unknown')).not.toBeInTheDocument();
    });

    it('hides icons for suggestions when icon is not present', async () => {
      const suggestionsWithTypes = [
        { name: '@timestamp', type: 'date' },
        { name: 'log.level', type: 'keyword' },
        { name: 'message', type: 'text' },
        { name: 'test_field' },
      ];

      render(<AutocompleteSelector {...defaultProps} suggestions={suggestionsWithTypes} />);

      const toggleButton = screen.getByTestId('comboBoxToggleListButton');
      await userEvent.click(toggleButton);

      // Verify that field icons are not rendered for fields with types
      expect(screen.queryByTestId('field-icon-date')).not.toBeInTheDocument();
      expect(screen.queryByTestId('field-icon-keyword')).not.toBeInTheDocument();
      expect(screen.queryByTestId('field-icon-text')).not.toBeInTheDocument();
      expect(screen.queryByTestId('field-icon-unknown')).not.toBeInTheDocument();
    });
  });

  describe('Prepend Element', () => {
    it('does not render prepend element when not provided', () => {
      render(<AutocompleteSelector {...defaultProps} />);

      expect(screen.queryByTestId('test-prepend-element')).not.toBeInTheDocument();
    });

    it('renders prepend element when provided', () => {
      const prependElement = (
        <span data-test-subj="test-prepend-element">Prepend</span>
      ) as unknown as EuiComboBoxProps<string>['prepend'];
      render(<AutocompleteSelector {...defaultProps} prepend={prependElement} />);

      expect(screen.getByTestId('test-prepend-element')).toBeInTheDocument();
      expect(screen.getByText('Prepend')).toBeInTheDocument();
    });

    it('renders checkbox as prepend element', () => {
      const prependCheckbox = (
        <input
          type="checkbox"
          data-test-subj="test-prepend-checkbox"
          defaultChecked
          aria-label="Test checkbox"
        />
      ) as unknown as EuiComboBoxProps<string>['prepend'];
      render(<AutocompleteSelector {...defaultProps} prepend={prependCheckbox} />);

      const checkbox = screen.getByTestId('test-prepend-checkbox') as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(checkbox.checked).toBe(true);
    });

    it('allows interaction with prepended checkbox while using combobox', async () => {
      const handleCheckboxChange = jest.fn();
      const handleComboboxChange = jest.fn();

      const prependCheckbox = (
        <input
          type="checkbox"
          data-test-subj="test-prepend-checkbox"
          onChange={handleCheckboxChange}
          aria-label="Test checkbox"
        />
      ) as unknown as EuiComboBoxProps<string>['prepend'];

      render(
        <AutocompleteSelector
          {...defaultProps}
          prepend={prependCheckbox}
          onChange={handleComboboxChange}
        />
      );

      // Click the checkbox
      const checkbox = screen.getByTestId('test-prepend-checkbox');
      await userEvent.click(checkbox);
      expect(handleCheckboxChange).toHaveBeenCalled();

      // Also ensure combobox still works
      const input = screen.getByTestId('comboBoxSearchInput');
      await userEvent.type(input, 'test-value');
      await userEvent.keyboard('{Enter}');
      expect(handleComboboxChange).toHaveBeenCalledWith('test-value');
    });
  });
});
