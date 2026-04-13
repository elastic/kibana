/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { BulkTagsModal } from './bulk_tags_modal';
import { useFetchAlertEpisodeTagSuggestions } from '../../hooks/use_fetch_alert_episode_tag_suggestions';

jest.mock('../../hooks/use_fetch_alert_episode_tag_suggestions');
const mockUseFetchSuggestions = jest.mocked(useFetchAlertEpisodeTagSuggestions);

const mockExpressions = expressionsPluginMock.createStartContract();
const defaultProps = {
  onClose: jest.fn(),
  onSave: jest.fn(),
  services: { expressions: mockExpressions },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseFetchSuggestions.mockReturnValue({
    data: ['existing-tag', 'another-tag'],
    isLoading: false,
    isError: false,
    isSuccess: true,
  } as unknown as ReturnType<typeof useFetchAlertEpisodeTagSuggestions>);
});

describe('BulkTagsModal', () => {
  it('renders the modal title', () => {
    render(<BulkTagsModal {...defaultProps} />);
    expect(screen.getByText('Set tags for selected episodes')).toBeInTheDocument();
  });

  it('renders the replace warning', () => {
    render(<BulkTagsModal {...defaultProps} />);
    expect(
      screen.getByText(/These tags will replace any existing tags on all selected episodes/)
    ).toBeInTheDocument();
  });

  it('renders the combobox', () => {
    render(<BulkTagsModal {...defaultProps} />);
    expect(screen.getByTestId('bulkTagsModalComboBox')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    render(<BulkTagsModal {...defaultProps} onClose={mockOnClose} />);
    await user.click(screen.getByTestId('bulkTagsModalCancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onSave with empty array and onClose when saved with no selection', async () => {
    const user = userEvent.setup();
    const mockOnSave = jest.fn();
    const mockOnClose = jest.fn();
    render(<BulkTagsModal {...defaultProps} onSave={mockOnSave} onClose={mockOnClose} />);
    await user.click(screen.getByTestId('bulkTagsModalSave'));
    expect(mockOnSave).toHaveBeenCalledWith([]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when the EUI modal close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    render(<BulkTagsModal {...defaultProps} onClose={mockOnClose} />);
    await user.click(screen.getByLabelText('Closes this modal window'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
