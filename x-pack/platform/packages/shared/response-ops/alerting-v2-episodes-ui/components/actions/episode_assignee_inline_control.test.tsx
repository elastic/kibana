/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { EpisodeAssigneeInlineControl } from './episode_assignee_inline_control';

const mockOnApply = jest.fn();

jest.mock('./episode_assignee_panel', () => ({
  EPISODE_ASSIGNEE_PANEL_WIDTH: 400,
  EpisodeAssigneePanel: ({ onApply }: { onApply: (uid: string | null) => void }) => (
    <button type="button" data-test-subj="mockApply" onClick={() => onApply('uid-joana')}>
      {'Apply'}
    </button>
  ),
}));

jest.mock('../assignee_cell', () => ({
  AlertEpisodeAssigneeCell: ({ assigneeUid }: { assigneeUid: string | null }) => (
    <span data-test-subj="assigneeCellStub">{assigneeUid}</span>
  ),
}));

const mockUserProfile = {} as UserProfileService;

const renderControl = (props: { isDisabled?: boolean; assigneeUid?: string | null } = {}) =>
  render(
    <EpisodeAssigneeInlineControl
      assigneeUid={null}
      userProfile={mockUserProfile}
      onApply={mockOnApply}
      {...props}
    />
  );

beforeEach(() => jest.clearAllMocks());

describe('EpisodeAssigneeInlineControl', () => {
  it('renders a circled plus button', () => {
    renderControl();

    const button = screen.getByTestId('alertingV2EpisodeAssigneeAddButton');
    expect(button.querySelector('[data-euiicon-type="plusCircle"]')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Add assignee');
  });

  it('keeps the picker closed until the button is clicked', async () => {
    renderControl();

    expect(screen.queryByTestId('mockApply')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('alertingV2EpisodeAssigneeAddButton'));

    expect(await screen.findByTestId('mockApply')).toBeInTheDocument();
  });

  it('forwards the picked uid and closes the picker on apply', async () => {
    renderControl();

    await userEvent.click(screen.getByTestId('alertingV2EpisodeAssigneeAddButton'));
    // fireEvent skips the pointer-events guard EuiPopover sets on its panel while
    // it animates open, which userEvent would otherwise reject.
    fireEvent.click(await screen.findByTestId('mockApply'));

    expect(mockOnApply).toHaveBeenCalledWith('uid-joana');
    await waitFor(() => {
      expect(screen.queryByTestId('mockApply')).not.toBeInTheDocument();
    });
  });

  it('does not open the picker while disabled', () => {
    renderControl({ isDisabled: true });

    const button = screen.getByTestId('alertingV2EpisodeAssigneeAddButton');
    expect(button).toBeDisabled();

    // fireEvent bypasses the pointer-events guard that blocks userEvent on a
    // disabled button, so this asserts the handler itself stays inert.
    fireEvent.click(button);

    expect(screen.queryByTestId('mockApply')).not.toBeInTheDocument();
  });

  describe('when the episode already has an assignee', () => {
    it('anchors to the assignee instead of a plus button', () => {
      renderControl({ assigneeUid: 'uid-existing' });

      expect(screen.queryByTestId('alertingV2EpisodeAssigneeAddButton')).not.toBeInTheDocument();
      const button = screen.getByTestId('alertingV2EpisodeAssigneeChangeButton');
      expect(button).toHaveAttribute('aria-label', 'Change assignee');
      expect(screen.getByTestId('assigneeCellStub')).toHaveTextContent('uid-existing');
    });

    it('opens the picker when the assignee is clicked', async () => {
      renderControl({ assigneeUid: 'uid-existing' });

      expect(screen.queryByTestId('mockApply')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('alertingV2EpisodeAssigneeChangeButton'));

      expect(await screen.findByTestId('mockApply')).toBeInTheDocument();
    });

    it('forwards the reassigned uid on apply', async () => {
      renderControl({ assigneeUid: 'uid-existing' });

      await userEvent.click(screen.getByTestId('alertingV2EpisodeAssigneeChangeButton'));
      fireEvent.click(await screen.findByTestId('mockApply'));

      expect(mockOnApply).toHaveBeenCalledWith('uid-joana');
    });
  });
});
