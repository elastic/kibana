/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { ALERT_ID_FIELD, ALERT_STATUS_FIELD } from '@kbn/alerting-v2-constants';
import type { AlertEpisode, EpisodesSortState } from '../queries/episodes_query';
import { mergeEpisodes } from './merge_episodes';

const makeEpisode = (overrides: Partial<AlertEpisode>): AlertEpisode => ({
  '@timestamp': '2024-01-01T00:00:00.000Z',
  [ALERT_ID_FIELD]: 'ep-1',
  [ALERT_STATUS_FIELD]: ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2024-01-01T00:00:00.000Z',
  last_timestamp: '2024-01-01T00:00:00.000Z',
  duration: 1000,
  last_assignee_uid: null,
  last_tags: [],
  episode_data: null,
  severity: null,
  ...overrides,
});

describe('mergeEpisodes', () => {
  const defaultSort: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' };

  it('merges v2 and classic episodes into one sorted list', () => {
    const v2 = [makeEpisode({ '@timestamp': '2024-01-01T03:00:00.000Z', [ALERT_ID_FIELD]: 'v2-1' })];
    const classic = [
      makeEpisode({ '@timestamp': '2024-01-01T04:00:00.000Z', [ALERT_ID_FIELD]: 'classic-1' }),
    ];

    const result = mergeEpisodes([v2, classic], defaultSort, 10);

    expect(result[0][ALERT_ID_FIELD]).toBe('classic-1');
    expect(result[1][ALERT_ID_FIELD]).toBe('v2-1');
  });

  it('sorts ascending when sortDirection is asc', () => {
    const v2 = [makeEpisode({ '@timestamp': '2024-01-01T03:00:00.000Z', [ALERT_ID_FIELD]: 'v2-1' })];
    const classic = [
      makeEpisode({ '@timestamp': '2024-01-01T01:00:00.000Z', [ALERT_ID_FIELD]: 'classic-1' }),
    ];

    const result = mergeEpisodes(
      [v2, classic],
      { sortField: '@timestamp', sortDirection: 'asc' },
      10
    );

    expect(result[0][ALERT_ID_FIELD]).toBe('classic-1');
    expect(result[1][ALERT_ID_FIELD]).toBe('v2-1');
  });

  it('limits the result to pageSize', () => {
    const v2 = Array.from({ length: 5 }, (_, i) =>
      makeEpisode({ '@timestamp': `2024-01-01T0${i}:00:00.000Z`, [ALERT_ID_FIELD]: `v2-${i}` })
    );
    const classic = Array.from({ length: 5 }, (_, i) =>
      makeEpisode({
        '@timestamp': `2024-01-02T0${i}:00:00.000Z`,
        [ALERT_ID_FIELD]: `classic-${i}`,
      })
    );

    const result = mergeEpisodes([v2, classic], defaultSort, 3);
    expect(result).toHaveLength(3);
  });

  it('handles empty classic array', () => {
    const v2 = [makeEpisode({ [ALERT_ID_FIELD]: 'v2-only' })];
    const result = mergeEpisodes([v2, []], defaultSort, 10);

    expect(result).toHaveLength(1);
    expect(result[0][ALERT_ID_FIELD]).toBe('v2-only');
  });

  it('handles empty v2 array', () => {
    const classic = [makeEpisode({ [ALERT_ID_FIELD]: 'classic-only', supports_actions: false })];
    const result = mergeEpisodes([[], classic], defaultSort, 10);

    expect(result).toHaveLength(1);
    expect(result[0][ALERT_ID_FIELD]).toBe('classic-only');
  });

  it('sorts by severity correctly', () => {
    const v2 = [makeEpisode({ [ALERT_ID_FIELD]: 'low', severity: 'low' })];
    const classic = [makeEpisode({ [ALERT_ID_FIELD]: 'critical', severity: 'critical' })];

    const result = mergeEpisodes(
      [v2, classic],
      { sortField: 'severity', sortDirection: 'desc' },
      10
    );

    expect(result[0][ALERT_ID_FIELD]).toBe('critical');
    expect(result[1][ALERT_ID_FIELD]).toBe('low');
  });

  it('sorts by duration numerically', () => {
    const v2 = [makeEpisode({ [ALERT_ID_FIELD]: 'short', duration: 100 })];
    const classic = [makeEpisode({ [ALERT_ID_FIELD]: 'long', duration: 9999 })];

    const result = mergeEpisodes(
      [v2, classic],
      { sortField: 'duration', sortDirection: 'desc' },
      10
    );

    expect(result[0][ALERT_ID_FIELD]).toBe('long');
    expect(result[1][ALERT_ID_FIELD]).toBe('short');
  });

  it('sorts chronologically when v2 timestamps are epoch ms and classic are ISO strings', () => {
    const v2Newer = makeEpisode({
      [ALERT_ID_FIELD]: 'v2-newer',
      '@timestamp': Date.parse('2024-07-03T10:03:20.000Z') as unknown as string,
    });
    const v2Older = makeEpisode({
      [ALERT_ID_FIELD]: 'v2-older',
      '@timestamp': Date.parse('2024-07-03T09:46:40.000Z') as unknown as string,
    });
    const classicNewer = makeEpisode({
      [ALERT_ID_FIELD]: 'classic-newer',
      '@timestamp': '2024-07-03T12:00:00.000Z',
      supports_actions: false,
    });
    const classicOlder = makeEpisode({
      [ALERT_ID_FIELD]: 'classic-older',
      '@timestamp': '2024-07-03T10:00:00.000Z',
      supports_actions: false,
    });

    const result = mergeEpisodes(
      [
        [v2Newer, v2Older],
        [classicNewer, classicOlder],
      ],
      defaultSort,
      10
    );

    expect(result.map((ep) => ep[ALERT_ID_FIELD])).toEqual([
      'classic-newer',
      'v2-newer',
      'classic-older',
      'v2-older',
    ]);
  });
});
