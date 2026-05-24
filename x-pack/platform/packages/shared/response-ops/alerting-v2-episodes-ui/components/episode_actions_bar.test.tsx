/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction } from '../actions/types';
import type { AlertEpisode } from '../queries/episodes_query';
import { EpisodeActionsBar } from './episode_actions_bar';

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

beforeEach(() => jest.clearAllMocks());

describe('EpisodeActionsBar', () => {
  it('renders nothing when actions is empty', () => {
    const { container } = render(
      <EpisodeActionsBar actions={[]} episodes={mockEpisodes} onSuccess={mockOnSuccess} />
    );
    expect(
      container.querySelector('[data-test-subj="episodeActionsBar-overflow-trigger"]')
    ).toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('renders primary actions inline and not in the overflow', () => {
    const ackAction = makeAction('ALERTING_V2_ACK_EPISODE');
    const unackAction = makeAction('ALERTING_V2_UNACK_EPISODE');

    render(
      <EpisodeActionsBar
        actions={[ackAction, unackAction]}
        episodes={mockEpisodes}
        onSuccess={mockOnSuccess}
      />
    );

    expect(
      screen.getByTestId('episodeActionsBar-primary-ALERTING_V2_ACK_EPISODE')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('episodeActionsBar-primary-ALERTING_V2_UNACK_EPISODE')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('episodeActionsBar-overflow-trigger')).not.toBeInTheDocument();
  });

  it('renders non-primary actions in the overflow after trigger click', () => {
    const viewAction = makeAction('ALERTING_V2_VIEW_DETAILS');
    const discoverAction = makeAction('ALERTING_V2_OPEN_IN_DISCOVER');

    render(
      <EpisodeActionsBar
        actions={[viewAction, discoverAction]}
        episodes={mockEpisodes}
        onSuccess={mockOnSuccess}
      />
    );

    expect(
      screen.queryByTestId('episodeActionsBar-overflow-ALERTING_V2_VIEW_DETAILS')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('episodeActionsBar-overflow-trigger'));

    expect(
      screen.getByTestId('episodeActionsBar-overflow-ALERTING_V2_VIEW_DETAILS')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('episodeActionsBar-overflow-ALERTING_V2_OPEN_IN_DISCOVER')
    ).toBeInTheDocument();
  });

  it('calls action.execute with episodes and onSuccess when a primary button is clicked', () => {
    const ackAction = makeAction('ALERTING_V2_ACK_EPISODE');

    render(
      <EpisodeActionsBar actions={[ackAction]} episodes={mockEpisodes} onSuccess={mockOnSuccess} />
    );

    fireEvent.click(screen.getByTestId('episodeActionsBar-primary-ALERTING_V2_ACK_EPISODE'));

    expect(ackAction.execute).toHaveBeenCalledTimes(1);
    expect(ackAction.execute).toHaveBeenCalledWith({
      episodes: mockEpisodes,
      onSuccess: mockOnSuccess,
    });
  });

  it('calls action.execute and closes the popover when an overflow item is clicked', () => {
    const viewAction = makeAction('ALERTING_V2_VIEW_DETAILS');

    const { rerender } = render(
      <EpisodeActionsBar actions={[viewAction]} episodes={mockEpisodes} onSuccess={mockOnSuccess} />
    );

    const trigger = screen.getByTestId('episodeActionsBar-overflow-trigger');
    fireEvent.click(trigger);
    expect(
      screen.getByTestId('episodeActionsBar-overflow-ALERTING_V2_VIEW_DETAILS')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('episodeActionsBar-overflow-ALERTING_V2_VIEW_DETAILS'));

    expect(viewAction.execute).toHaveBeenCalledTimes(1);
    expect(viewAction.execute).toHaveBeenCalledWith({
      episodes: mockEpisodes,
      onSuccess: mockOnSuccess,
    });

    // Force a re-render and verify the popover state was reset by checking the popover wrapper
    // does not have isOpen class (EUI adds euiPopover-isOpen when open/opening)
    rerender(
      <EpisodeActionsBar actions={[viewAction]} episodes={mockEpisodes} onSuccess={mockOnSuccess} />
    );
    const popoverWrapper = screen.getByTestId('episodeActionsBar-overflow');
    expect(popoverWrapper.className).not.toContain('euiPopover-isOpen');
  });

  it('does not render the overflow trigger when there are only primary actions', () => {
    const snoozeAction = makeAction('ALERTING_V2_SNOOZE_EPISODE');
    const unsnoozeAction = makeAction('ALERTING_V2_UNSNOOZE_EPISODE');

    render(
      <EpisodeActionsBar
        actions={[snoozeAction, unsnoozeAction]}
        episodes={mockEpisodes}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByTestId('episodeActionsBar-overflow-trigger')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('episodeActionsBar-primary-ALERTING_V2_SNOOZE_EPISODE')
    ).toBeInTheDocument();
  });

  it('renders no inline primary slot but renders the overflow trigger when there are only overflow actions', () => {
    const viewAction = makeAction('ALERTING_V2_VIEW_DETAILS');

    render(
      <EpisodeActionsBar actions={[viewAction]} episodes={mockEpisodes} onSuccess={mockOnSuccess} />
    );

    expect(
      screen.queryByTestId('episodeActionsBar-primary-ALERTING_V2_VIEW_DETAILS')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('episodeActionsBar-overflow-trigger')).toBeInTheDocument();
  });
});
