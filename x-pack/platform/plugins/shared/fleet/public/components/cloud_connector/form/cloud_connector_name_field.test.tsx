/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import { CloudConnectorNameField } from './cloud_connector_name_field';

// Helper to render with I18n provider
const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('CloudConnectorNameField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the field with correct label', () => {
      renderWithIntl(<CloudConnectorNameField value="" onChange={mockOnChange} />);

      expect(screen.getByText('Cloud Connector Name')).toBeInTheDocument();
    });

    it('renders with initial value', () => {
      renderWithIntl(
        <CloudConnectorNameField value="my-cloud-connector" onChange={mockOnChange} />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('my-cloud-connector');
    });

    it('renders as disabled when disabled prop is true', () => {
      renderWithIntl(<CloudConnectorNameField value="" onChange={mockOnChange} disabled={true} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('renders as enabled by default', () => {
      renderWithIntl(<CloudConnectorNameField value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeEnabled();
    });
  });

  describe('Validation - Empty Name', () => {
    it('shows error when value is empty', () => {
      renderWithIntl(<CloudConnectorNameField value="" onChange={mockOnChange} />);

      expect(screen.getByText('Cloud Connector Name is required')).toBeInTheDocument();
    });

    it('calls onChange with isValid=false when clearing the field', async () => {
      const user = userEvent.setup();
      renderWithIntl(<CloudConnectorNameField value="existing-name" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.clear(input);

      expect(mockOnChange).toHaveBeenLastCalledWith('', false, 'Cloud Connector Name is required');
    });
  });

  describe('Validation - Valid Names', () => {
    it('does not show error for valid short name', () => {
      renderWithIntl(<CloudConnectorNameField value="valid-name" onChange={mockOnChange} />);

      expect(screen.queryByText('Cloud Connector Name is required')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Cloud Connector Name must be 255 characters or less')
      ).not.toBeInTheDocument();
    });

    it('calls onChange with isValid=true for valid input', async () => {
      const user = userEvent.setup();
      renderWithIntl(<CloudConnectorNameField value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      const validName = 'my-connector';
      await user.click(input);
      await user.paste(validName);

      // Verify onChange was called with the complete valid string
      expect(mockOnChange).toHaveBeenCalledWith(validName, true, undefined);
    });

    it('accepts a name with exactly 255 characters', () => {
      const exactly255Chars = 'a'.repeat(255);
      renderWithIntl(<CloudConnectorNameField value={exactly255Chars} onChange={mockOnChange} />);

      expect(
        screen.queryByText('Cloud Connector Name must be 255 characters or less')
      ).not.toBeInTheDocument();
    });

    it('accepts input of 255 character name', async () => {
      const user = userEvent.setup();
      renderWithIntl(<CloudConnectorNameField value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      const exactly255Chars = 'a'.repeat(255);
      await user.click(input);
      await user.paste(exactly255Chars);

      // Verify onChange was called with the complete 255-char string as valid
      expect(mockOnChange).toHaveBeenCalledWith(exactly255Chars, true, undefined);
    });
  });

  describe('Validation - Names Exceeding 255 Characters', () => {
    it('shows error when name exceeds 255 characters', () => {
      const moreThan255Chars = 'a'.repeat(256);
      renderWithIntl(<CloudConnectorNameField value={moreThan255Chars} onChange={mockOnChange} />);

      expect(
        screen.getByText('Cloud Connector Name must be 255 characters or less')
      ).toBeInTheDocument();
    });

    it('calls onChange with isValid=false for 256 character name', async () => {
      const user = userEvent.setup();
      renderWithIntl(<CloudConnectorNameField value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      const exactly256Chars = 'a'.repeat(256);
      await user.click(input);
      await user.paste(exactly256Chars);

      // Verify onChange was called with the 256-char string as invalid
      expect(mockOnChange).toHaveBeenCalledWith(
        exactly256Chars,
        false,
        'Cloud Connector Name must be 255 characters or less'
      );
    });

    it('marks field as invalid visually when exceeding 255 characters', () => {
      const moreThan255Chars = 'a'.repeat(256);
      renderWithIntl(<CloudConnectorNameField value={moreThan255Chars} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('onChange Callback', () => {
    it('calls onChange for each character typed', async () => {
      const user = userEvent.setup();
      renderWithIntl(<CloudConnectorNameField value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');

      await user.type(input, 'abc');

      // Should be called once for each character typed
      expect(mockOnChange).toHaveBeenCalledTimes(3);

      // Verify onChange is called with valid=true for each character
      expect(mockOnChange).toHaveBeenNthCalledWith(1, 'a', true, undefined);
      expect(mockOnChange).toHaveBeenNthCalledWith(2, 'b', true, undefined);
      expect(mockOnChange).toHaveBeenNthCalledWith(3, 'c', true, undefined);
    });

    it('provides validation error string when name is invalid', async () => {
      const user = userEvent.setup();
      renderWithIntl(<CloudConnectorNameField value="valid" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.clear(input);

      expect(mockOnChange).toHaveBeenCalledWith('', false, 'Cloud Connector Name is required');
    });

    it('provides undefined error when name is valid', async () => {
      const user = userEvent.setup();
      renderWithIntl(<CloudConnectorNameField value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      const validName = 'valid-name';
      await user.click(input);
      await user.paste(validName);

      // Verify onChange was called with the complete string and undefined error (valid)
      expect(mockOnChange).toHaveBeenCalledWith(validName, true, undefined);
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters in name', async () => {
      const user = userEvent.setup();
      renderWithIntl(<CloudConnectorNameField value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      const nameWithSpecialChars = 'my-connector_123!@#';
      await user.click(input);
      await user.paste(nameWithSpecialChars);

      // Verify onChange was called with the complete string as valid
      expect(mockOnChange).toHaveBeenCalledWith(nameWithSpecialChars, true, undefined);
    });

    it('handles unicode characters in name', async () => {
      const user = userEvent.setup();
      renderWithIntl(<CloudConnectorNameField value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      const unicodeName = 'connector-中文-名称';
      await user.click(input);
      await user.paste(unicodeName);

      // Verify onChange was called with the complete string as valid
      expect(mockOnChange).toHaveBeenCalledWith(unicodeName, true, undefined);
    });
  });

  describe('Character Limit Boundary Testing', () => {
    it('validates correctly at 254 characters (valid)', () => {
      const chars254 = 'a'.repeat(254);
      renderWithIntl(<CloudConnectorNameField value={chars254} onChange={mockOnChange} />);

      expect(
        screen.queryByText('Cloud Connector Name must be 255 characters or less')
      ).not.toBeInTheDocument();
    });

    it('validates correctly at 255 characters (valid - boundary)', () => {
      const chars255 = 'a'.repeat(255);
      renderWithIntl(<CloudConnectorNameField value={chars255} onChange={mockOnChange} />);

      expect(
        screen.queryByText('Cloud Connector Name must be 255 characters or less')
      ).not.toBeInTheDocument();
    });

    it('validates correctly at 256 characters (invalid - just over boundary)', () => {
      const chars256 = 'a'.repeat(256);
      renderWithIntl(<CloudConnectorNameField value={chars256} onChange={mockOnChange} />);

      expect(
        screen.getByText('Cloud Connector Name must be 255 characters or less')
      ).toBeInTheDocument();
    });

    it('validates correctly at 257 characters (invalid)', () => {
      const chars257 = 'a'.repeat(257);
      renderWithIntl(<CloudConnectorNameField value={chars257} onChange={mockOnChange} />);

      expect(
        screen.getByText('Cloud Connector Name must be 255 characters or less')
      ).toBeInTheDocument();
    });
  });
});
