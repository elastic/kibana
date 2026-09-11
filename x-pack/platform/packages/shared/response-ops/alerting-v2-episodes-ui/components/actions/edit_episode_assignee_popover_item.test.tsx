/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditEpisodeAssigneePopoverItem } from './edit_episode_assignee_popover_item';

const mockOnApply = jest.fn();
const mockCloseMenu = jest.fn();

jest.mock('./episode_assignee_panel', () => ({
  EPISODE_ASSIGNEE_PANEL_WIDTH: 400,
  EpisodeAssigneePanel: ({ onApply }: { onApply: (uid: string | null) => void }) => (
    <button type="button" data-test-subj="mockApply" onClick={() => onApply('uid-joana')}>
      {'Apply'}
    </button>
  ),
}));

const renderItem = () =>
  render(
    <EditEpisodeAssigneePopoverItem
      assigneeUid={null}
      label="Edit assignee"
      iconType="user"
      onApply={mockOnApply}
      closeMenu={mockCloseMenu}
    />
  );

beforeEach(() => jest.clearAllMocks());

describe('EditEpisodeAssigneePopoverItem', () => {
  it('keeps the picker closed until the menu item is clicked', async () => {
    renderItem();

    expect(screen.queryByTestId('mockApply')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('alertingV2EditEpisodeAssigneeMenuItem'));

    expect(await screen.findByTestId('mockApply')).toBeInTheDocument();
  });

  it('does not close the hosting menu when the picker opens', async () => {
    renderItem();

    await userEvent.click(screen.getByTestId('alertingV2EditEpisodeAssigneeMenuItem'));

    expect(await screen.findByTestId('mockApply')).toBeInTheDocument();
    expect(mockCloseMenu).not.toHaveBeenCalled();
  });

  it('forwards the applied uid and tears down both the picker and the menu', async () => {
    renderItem();

    await userEvent.click(screen.getByTestId('alertingV2EditEpisodeAssigneeMenuItem'));
    // The popover panel is `pointer-events: none` mid-animation under jsdom,
    // which userEvent refuses to click through.
    fireEvent.click(await screen.findByTestId('mockApply'));

    expect(mockOnApply).toHaveBeenCalledWith('uid-joana');
    expect(mockCloseMenu).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByTestId('mockApply')).not.toBeInTheDocument();
    });
  });
});
