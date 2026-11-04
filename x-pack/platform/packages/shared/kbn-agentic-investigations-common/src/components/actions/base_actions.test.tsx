/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Investigation } from '../../types';
import { BaseActions } from './base_actions';
import { getCopyLinkFlyoutAction } from './copy_link_action';

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Impossible travel — exec account',
  createdAt: '2024-01-01T00:00:00Z',
  worker_execution_ids: ['exec-1'],
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
        investigation={{ ...investigation, recommendedAction: 'closed' }}
        canCloseInvestigation
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

describe('BaseActions recommended action', () => {
  it('does not offer the recommended action in the menu', () => {
    renderWithKibanaRenderContext(
      <BaseActions
        investigation={{
          ...investigation,
          recommendedAction: 'respond',
          primaryActionLabel: 'Revoke sessions',
        }}
        onClickAction={jest.fn()}
        onCopyLink={jest.fn()}
        data-test-subj="actions"
      />
    );

    openMenu();

    expect(screen.queryByText('Revoke sessions')).not.toBeInTheDocument();
    expect(screen.getByText('Copy link')).toBeInTheDocument();
  });
});

describe('BaseActions open and close', () => {
  const renderMenu = (props: Partial<React.ComponentProps<typeof BaseActions>> = {}) => {
    const onClickAction = jest.fn();
    renderWithKibanaRenderContext(
      <BaseActions
        investigation={investigation}
        canCloseInvestigation
        onClickAction={onClickAction}
        onCopyLink={jest.fn()}
        data-test-subj="actions"
        {...props}
      />
    );
    openMenu();
    return onClickAction;
  };

  it('offers Close, not Open, on an open investigation', () => {
    renderMenu({ investigation: { ...investigation, conversationStatus: 'open' } });

    expect(screen.getByText('Close investigation')).toBeInTheDocument();
    expect(screen.queryByText('Open investigation')).not.toBeInTheDocument();
  });

  it('offers Open, not Close, on a closed investigation, and reports the reopen', () => {
    const onClickAction = renderMenu({
      investigation: { ...investigation, conversationStatus: 'closed' },
    });

    expect(screen.queryByText('Close investigation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Open investigation'));

    expect(onClickAction).toHaveBeenCalledWith('reopen', investigation.recordId);
  });

  it('offers Open on a closed investigation whose action is decided', () => {
    renderMenu({
      investigation: {
        ...investigation,
        conversationStatus: 'closed',
        recommendedAction: 'closed',
      },
    });

    expect(screen.getByText('Open investigation')).toBeInTheDocument();
  });

  it('offers neither without the capability', () => {
    renderMenu({
      canCloseInvestigation: false,
      investigation: { ...investigation, conversationStatus: 'closed' },
    });

    expect(screen.queryByText('Open investigation')).not.toBeInTheDocument();
    expect(screen.queryByText('Close investigation')).not.toBeInTheDocument();
  });
});

describe('getCopyLinkFlyoutAction', () => {
  const renderTooltip = (action: ReturnType<typeof getCopyLinkFlyoutAction>) =>
    renderWithKibanaRenderContext(<>{action.toolTipContent}</>);

  it('builds the flyout icon button from the same label as the menu item', () => {
    const action = getCopyLinkFlyoutAction(() => true);

    expect(action).toMatchObject({ iconType: 'link', 'aria-label': 'Copy link' });
  });

  it('confirms a successful copy in its tooltip', () => {
    const onCopy = jest.fn().mockReturnValue(true);
    const action = getCopyLinkFlyoutAction(onCopy);
    renderTooltip(action);
    expect(screen.getByText('Copy link')).toBeInTheDocument();

    act(() => action.onClick?.({} as never));

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Link copied')).toBeInTheDocument();
  });

  it('keeps the plain label when the copy fails', () => {
    const action = getCopyLinkFlyoutAction(() => false);
    renderTooltip(action);

    act(() => action.onClick?.({} as never));

    expect(screen.getByText('Copy link')).toBeInTheDocument();
    expect(screen.queryByText('Link copied')).not.toBeInTheDocument();
  });

  it('reads "Copy link" again once the tooltip has closed and reopens', () => {
    const action = getCopyLinkFlyoutAction(() => true);
    const { unmount } = renderTooltip(action);
    act(() => action.onClick?.({} as never));
    unmount();

    renderTooltip(action);

    expect(screen.getByText('Copy link')).toBeInTheDocument();
  });
});
