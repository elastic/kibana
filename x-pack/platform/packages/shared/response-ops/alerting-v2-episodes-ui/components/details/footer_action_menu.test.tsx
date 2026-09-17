/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction } from '../../actions/types';
import { EpisodeFooterActionMenu } from './footer_action_menu';

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

const renderMenu = (actions: EpisodeAction[]) =>
  render(
    <EpisodeFooterActionMenu
      actions={actions}
      episodes={mockEpisodes}
      viewDetailsHref="/app/management/alertingV2/episodes/ep-1"
      onSuccess={mockOnSuccess}
    />
  );

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
});
