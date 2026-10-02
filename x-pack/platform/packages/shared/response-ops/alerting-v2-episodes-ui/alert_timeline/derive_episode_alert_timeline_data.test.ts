/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeEventRow } from '@kbn/alerting-v2-common-queries';
import { deriveEpisodeAlertTimelineData } from './derive_episode_alert_timeline_data';

const createEvent = (
  timestamp: string,
  status: EpisodeEventRow['episode.status']
): EpisodeEventRow => ({
  '@timestamp': timestamp,
  'episode.id': 'episode-1',
  'episode.status': status,
  'rule.id': 'rule-1',
  group_hash: 'group-1',
});

describe('deriveEpisodeAlertTimelineData', () => {
  it('extends an open episode through the supplied current time', () => {
    const result = deriveEpisodeAlertTimelineData(
      [
        createEvent('2025-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.PENDING),
        createEvent('2025-01-01T00:05:00.000Z', ALERT_EPISODE_STATUS.ACTIVE),
      ],
      Date.parse('2025-01-01T00:10:00.000Z')
    );

    expect(result?.windowStartMs).toBe(Date.parse('2025-01-01T00:00:00.000Z'));
    expect(result?.windowEndMs).toBe(Date.parse('2025-01-01T00:10:00.000Z'));
    expect(result?.row.segments).toEqual([
      {
        episodeId: 'episode-1',
        status: ALERT_EPISODE_STATUS.PENDING,
        x0Ms: Date.parse('2025-01-01T00:00:00.000Z'),
        x1Ms: Date.parse('2025-01-01T00:05:00.000Z'),
        trueStartMs: Date.parse('2025-01-01T00:00:00.000Z'),
      },
      {
        episodeId: 'episode-1',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        x0Ms: Date.parse('2025-01-01T00:05:00.000Z'),
        x1Ms: Date.parse('2025-01-01T00:10:00.000Z'),
        trueStartMs: Date.parse('2025-01-01T00:05:00.000Z'),
      },
    ]);
  });

  it('ends a recovered episode at its inactive transition', () => {
    const result = deriveEpisodeAlertTimelineData(
      [
        createEvent('2025-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.ACTIVE),
        createEvent('2025-01-01T00:07:00.000Z', ALERT_EPISODE_STATUS.INACTIVE),
      ],
      Date.parse('2025-01-01T01:00:00.000Z')
    );

    expect(result?.windowEndMs).toBe(Date.parse('2025-01-01T00:07:00.000Z'));
    expect(result?.row.segments).toHaveLength(1);
    expect(result?.row.transitions.at(-1)).toEqual({
      episodeId: 'episode-1',
      status: ALERT_EPISODE_STATUS.INACTIVE,
      tsMs: Date.parse('2025-01-01T00:07:00.000Z'),
    });
  });

  it('ignores invalid events and returns no timeline when none remain', () => {
    expect(
      deriveEpisodeAlertTimelineData(
        [createEvent('not-a-date', ALERT_EPISODE_STATUS.ACTIVE)],
        Date.parse('2025-01-01T01:00:00.000Z')
      )
    ).toBeUndefined();
  });
});
