/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { StreamNameFormRow } from './stream_name_form_row';

const mockSnapshot = {
  context: {
    definition: {
      stream: { name: 'logs' },
    },
  },
};

jest.mock('./state_management/stream_routing_state_machine', () => ({
  useStreamsRoutingSelector: jest.fn((selector: any) => selector(mockSnapshot)),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('StreamNameFormRow', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    it('should show error for stream names with dots', () => {
      renderWithProviders(<StreamNameFormRow value="logs.test..invalid" onChange={mockOnChange} />);

      const input = screen.getByTestId('streamsAppRoutingStreamEntryNameField');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText(/Stream name cannot contain the "." character/i)).toBeInTheDocument();
    });

    it('should show error for empty stream name', () => {
      renderWithProviders(<StreamNameFormRow value="logs" onChange={mockOnChange} />);

      expect(screen.getByText(/Stream name is required/i)).toBeInTheDocument();
    });

    it('should show error for stream name exceeding max length', () => {
      const longName = 'logs.' + 'a'.repeat(200);
      renderWithProviders(<StreamNameFormRow value={longName} onChange={mockOnChange} />);

      expect(
        screen.getByText(/Stream name cannot be longer than 200 characters/i)
      ).toBeInTheDocument();
    });

    it('should accept valid stream name', () => {
      renderWithProviders(<StreamNameFormRow value="logs.valid-name" onChange={mockOnChange} />);

      const input = screen.getByTestId('streamsAppRoutingStreamEntryNameField');
      expect(input).not.toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveValue('valid-name');
    });
  });

  describe('Props', () => {
    it('should display prefix correctly', () => {
      renderWithProviders(<StreamNameFormRow value="logs.test" onChange={mockOnChange} />);

      expect(screen.getByTestId('streamsAppRoutingStreamNamePrefix')).toHaveTextContent('logs.');
    });

    it('should be read-only when readOnly prop is true', () => {
      renderWithProviders(
        <StreamNameFormRow value="logs.test" onChange={mockOnChange} readOnly={true} />
      );

      const input = screen.getByTestId('streamsAppRoutingStreamEntryNameField');
      expect(input).toHaveAttribute('readonly');
    });
  });
});
