/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Investigation } from '../../types';
import { BaseActions } from './base_actions';
import { getCopyLinkFlyoutAction } from './copy_link_action';

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Impossible travel — exec account',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  pendingProposalCount: 0,
  assignees: [],
  events: [],
};

const openMenu = () => fireEvent.click(screen.getByTestId('actions-button'));

describe('BaseActions copy link', () => {
  it('copies the link for this investigation from the menu', () => {
    const onCopyLink = jest.fn();
    renderWithKibanaRenderContext(
      <BaseActions
        investigation={investigation}
        onClickAction={jest.fn()}
        onCopyLink={onCopyLink}
        data-test-subj="actions"
      />
    );

    openMenu();
    fireEvent.click(screen.getByText('Copy link'));

    expect(onCopyLink).toHaveBeenCalledWith('inv-1');
  });

  it('keeps Copy link on a decided investigation, so the menu is never empty', () => {
    renderWithKibanaRenderContext(
      <BaseActions
        investigation={{ ...investigation, status: 'closed' }}
        onClickAction={jest.fn()}
        onCopyLink={jest.fn()}
        data-test-subj="actions"
      />
    );

    openMenu();

    expect(screen.getByText('Copy link')).toBeInTheDocument();
    expect(screen.queryByText('Close investigation')).not.toBeInTheDocument();
  });
});

describe('getCopyLinkFlyoutAction', () => {
  it('builds the flyout icon button from the same label as the menu item', () => {
    const onClick = jest.fn();
    const action = getCopyLinkFlyoutAction(onClick);

    expect(action).toMatchObject({
      iconType: 'link',
      'aria-label': 'Copy link',
      toolTipContent: 'Copy link',
    });
    action.onClick?.({} as never);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
