/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../../queries/episodes_query';
import { RelatedAlertEpisode } from './related_alert_episode';

describe('RelatedAlertEpisode', () => {
  const rule = {
    metadata: { name: 'CPU spike' },
    grouping: { fields: ['host.name'] },
  } as RuleResponse;

  const makeEpisode = (overrides: Partial<AlertEpisode> = {}): AlertEpisode => ({
    '@timestamp': '2026-04-06T13:30:00.000Z',
    'episode.id': 'ep-0',
    'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
    'rule.id': 'rule-1',
    group_hash: 'hash-1',
    first_timestamp: '2026-04-06T13:30:00.000Z',
    last_timestamp: '2026-04-06T13:31:00.000Z',
    duration: 60000,
    episode_data: JSON.stringify({ host: { name: 'server-1' } }),
    ...overrides,
  });

  it('renders rule name, status badges, and grouping value tags', () => {
    render(
      <RelatedAlertEpisode
        episode={makeEpisode({ 'episode.id': 'ep-1' })}
        rule={rule}
        href="/app/management/alertingV2/episodes/ep-1"
      />
    );

    expect(screen.getByText('CPU spike')).toBeInTheDocument();
    expect(screen.getByTestId('relatedAlertEpisode-ep-1')).toBeInTheDocument();
    expect(screen.getByTestId('relatedAlertEpisodeGrouping')).toBeInTheDocument();
    expect(screen.getByTestId('relatedAlertEpisodeGroupingTags')).toBeInTheDocument();
    expect(screen.getByText('server-1')).toBeInTheDocument();
    expect(screen.getByLabelText('host.name: server-1')).toBeInTheDocument();
  });

  it("uses the episode's own grouping_fields over the rule's current config", () => {
    // Rule now groups by host.name, but this episode was created under [region].
    render(
      <RelatedAlertEpisode
        episode={makeEpisode({
          'episode.id': 'ep-old',
          grouping_fields: ['region'],
          episode_data: JSON.stringify({ region: 'us-east', host: { name: 'server-1' } }),
        })}
        rule={rule}
        href="/x"
      />
    );

    expect(screen.getByText('us-east')).toBeInTheDocument();
    expect(screen.getByLabelText('region: us-east')).toBeInTheDocument();
    expect(screen.queryByText('server-1')).not.toBeInTheDocument();
  });

  it('omits status badges when episode status is missing', () => {
    const { 'episode.status': _status, ...episodeWithoutStatus } = makeEpisode({
      'episode.id': 'ep-2',
    });

    // @ts-expect-error - testing missing status field
    render(<RelatedAlertEpisode episode={episodeWithoutStatus} rule={rule} href="/x" />);

    expect(screen.queryByTestId('alertEpisodeStatusCell')).not.toBeInTheDocument();
  });
});
