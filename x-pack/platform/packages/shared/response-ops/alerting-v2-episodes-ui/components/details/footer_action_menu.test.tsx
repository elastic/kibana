/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction } from '../../actions/types';
import { EpisodeFooterActionMenu } from './footer_action_menu';

// EuiWrappingPopover portals to document.body via EuiPortal, which causes DOM
// teardown errors in jsdom and leaks content between tests. Mock it as a simple
// conditional renderer so the menu logic is tested without portal side-effects.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const MockWrappingPopover = ({
    isOpen,
    children,
    'data-test-subj': testSubj,
    className,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    'data-test-subj'?: string;
    className?: string;
  }) => (
    <div
      data-test-subj={testSubj}
      className={isOpen ? `${className ?? ''} euiPopover-isOpen` : className}
    >
      {isOpen ? children : null}
    </div>
  );
  return { ...actual, EuiWrappingPopover: MockWrappingPopover };
});

const mockEpisodes: AlertEpisode[] = [
  {
    '@timestamp': '2026-01-01T00:00:00.000Z',
    'episode.id': 'ep-1',
    'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
    'rule.id': 'rule-1',
    group_hash: 'hash-1',
    first_timestamp: '2026-01-01T00:00:00.000Z',
    last_timestamp: '2026-01-01T01:00:00.000Z',
    duration: 3600000,
  },
];

const makeAction = (id: string, overrides?: Partial<EpisodeAction>): EpisodeAction => ({
  id,
  order: 0,
  displayName: `Action ${id}`,
  iconType: 'check',
  isCompatible: () => true,
  execute: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockOnSuccess = jest.fn();

/**
 * TestWrapper renders a real anchor button and manages the isOpen state. It passes
 * the anchor element ref to EpisodeFooterActionMenu after it mounts (matching the
 * real flyout's PrimaryAction.onClick capture pattern).
 */
interface TestWrapperProps {
  actions: EpisodeAction[];
}
const TestWrapper = ({ actions }: TestWrapperProps) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        data-test-subj="alertingV2EpisodeFlyoutTakeActionButton"
        onClick={() => setIsOpen((prev) => !prev)}
      />
      {anchor && (
        <EpisodeFooterActionMenu
          anchor={anchor}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          actions={actions}
          episodes={mockEpisodes}
          viewDetailsHref="/app/management/alertingV2/episodes/ep-1"
          onSuccess={mockOnSuccess}
        />
      )}
    </>
  );
};

const renderMenu = (actions: EpisodeAction[]) => render(<TestWrapper actions={actions} />);

beforeEach(() => jest.clearAllMocks());

describe('EpisodeFooterActionMenu', () => {
  it('keeps the menu collapsed until the take action button is clicked', () => {
    renderMenu([makeAction('ALERTING_V2_ACK_EPISODE')]);

    expect(screen.queryByTestId('alertingV2EpisodeTakeAction-viewDetails')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTakeActionButton'));

    expect(screen.getByTestId('alertingV2EpisodeTakeAction-viewDetails')).toBeInTheDocument();
    expect(
      screen.getByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_ACK_EPISODE')
    ).toBeInTheDocument();
  });

  it('renders view details first, then workflow actions, then the remaining actions', () => {
    renderMenu([
      makeAction('ALERTING_V2_EDIT_EPISODE_TAGS'),
      makeAction('ALERTING_V2_ACK_EPISODE'),
      makeAction('ALERTING_V2_OPEN_EPISODE_IN_DISCOVER'),
      makeAction('ALERTING_V2_SNOOZE_EPISODE'),
      makeAction('ALERTING_V2_RESOLVE_EPISODE'),
      makeAction('ALERTING_V2_EDIT_EPISODE_ASSIGNEE'),
    ]);

    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTakeActionButton'));

    const itemTestSubjects = screen
      .getAllByRole('menuitem')
      .map((item) => item.getAttribute('data-test-subj'));

    expect(itemTestSubjects).toEqual([
      'alertingV2EpisodeTakeAction-viewDetails',
      'alertingV2EpisodeTakeAction-ALERTING_V2_ACK_EPISODE',
      'alertingV2EpisodeTakeAction-ALERTING_V2_SNOOZE_EPISODE',
      'alertingV2EpisodeTakeAction-ALERTING_V2_RESOLVE_EPISODE',
      'alertingV2EpisodeTakeAction-ALERTING_V2_EDIT_EPISODE_ASSIGNEE',
      'alertingV2EpisodeTakeAction-ALERTING_V2_EDIT_EPISODE_TAGS',
      'alertingV2EpisodeTakeAction-ALERTING_V2_OPEN_EPISODE_IN_DISCOVER',
    ]);
  });

  it('renders view details with the given href', () => {
    renderMenu([]);

    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTakeActionButton'));

    expect(screen.getByTestId('alertingV2EpisodeTakeAction-viewDetails')).toHaveAttribute(
      'href',
      '/app/management/alertingV2/episodes/ep-1'
    );
  });

  it('executes the action with the episodes and onSuccess, then closes the menu', () => {
    const ackAction = makeAction('ALERTING_V2_ACK_EPISODE');
    renderMenu([ackAction]);

    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTakeActionButton'));
    fireEvent.click(screen.getByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_ACK_EPISODE'));

    expect(ackAction.execute).toHaveBeenCalledTimes(1);
    expect(ackAction.execute).toHaveBeenCalledWith({
      episodes: mockEpisodes,
      onSuccess: mockOnSuccess,
    });
    expect(screen.getByTestId('alertingV2EpisodeFlyoutTakeAction').className).not.toContain(
      'euiPopover-isOpen'
    );
  });

  it('lets an action own its menu entry and hands it a menu closer', async () => {
    const renderMenuItem = jest.fn(({ closeMenu }) => (
      <button type="button" data-test-subj="ownEntry" onClick={closeMenu}>
        {'Own entry'}
      </button>
    ));
    const assigneeAction = makeAction('ALERTING_V2_EDIT_EPISODE_ASSIGNEE', { renderMenuItem });

    renderMenu([assigneeAction]);

    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTakeActionButton'));

    const ownEntry = await screen.findByTestId('ownEntry');
    expect(renderMenuItem).toHaveBeenCalledWith(
      expect.objectContaining({ episodes: mockEpisodes, onSuccess: mockOnSuccess })
    );
    // The default descriptor item is bypassed, so `execute` never fires on click.
    expect(
      screen.queryByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_EDIT_EPISODE_ASSIGNEE')
    ).not.toBeInTheDocument();

    fireEvent.click(ownEntry);

    await waitFor(() => {
      expect(screen.queryByTestId('ownEntry')).not.toBeInTheDocument();
    });
    expect(assigneeAction.execute).not.toHaveBeenCalled();
  });
});
