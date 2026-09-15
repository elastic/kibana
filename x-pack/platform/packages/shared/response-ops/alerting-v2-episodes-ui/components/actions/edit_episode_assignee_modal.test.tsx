/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { EditEpisodeAssigneeModal } from './edit_episode_assignee_modal';

const mockOnApply = jest.fn();
const mockOnClose = jest.fn();

jest.mock('./episode_assignee_panel', () => ({
  EPISODE_ASSIGNEE_PANEL_WIDTH: 400,
  EpisodeAssigneePanel: ({ onApply }: { onApply: (uid: string | null) => void }) => (
    <button type="button" data-test-subj="mockApply" onClick={() => onApply('uid-joana')}>
      {'Apply'}
    </button>
  ),
}));

const renderModal = (episodeCount?: number) =>
  render(
    <EditEpisodeAssigneeModal
      assigneeUid={null}
      episodeCount={episodeCount}
      onClose={mockOnClose}
      onApply={mockOnApply}
    />
  );

beforeEach(() => jest.clearAllMocks());

describe('EditEpisodeAssigneeModal', () => {
  it('renders the picker flush, without a modal body wrapper around it', () => {
    renderModal();

    const picker = screen.getByTestId('mockApply');
    // `EuiModalBody` pads an inner `.euiModalBody__overflow` element, which would
    // break the spacing match with the popover.
    expect(picker.closest('.euiModalBody')).toBeNull();
    expect(picker.closest('[data-test-subj="alertingV2EditEpisodeAssigneeModal"]')).not.toBeNull();
  });

  it('forwards the applied uid and then closes', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('mockApply'));

    expect(mockOnApply).toHaveBeenCalledWith('uid-joana');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('describes the whole selection for screen readers in bulk', () => {
    renderModal(3);

    expect(screen.getByTestId('alertingV2EditEpisodeAssigneeModal')).toHaveAttribute(
      'aria-label',
      'Edit assignee of 3 episodes'
    );
  });
});
