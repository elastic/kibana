/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode, EpisodesSortState } from '../queries/episodes_query';
import { mergeEpisodes } from './merge_episodes';

const makeEpisode = (overrides: Partial<AlertEpisode>): AlertEpisode => ({
  '@timestamp': '2024-01-01T00:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
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

  it('merges v2 and v1 episodes into one sorted list', () => {
    const v2 = [makeEpisode({ '@timestamp': '2024-01-01T03:00:00.000Z', 'episode.id': 'v2-1' })];
    const v1 = [makeEpisode({ '@timestamp': '2024-01-01T04:00:00.000Z', 'episode.id': 'v1-1' })];

    const result = mergeEpisodes(v2, v1, defaultSort, 10);

    expect(result[0]['episode.id']).toBe('v1-1');
    expect(result[1]['episode.id']).toBe('v2-1');
  });

  it('sorts ascending when sortDirection is asc', () => {
    const v2 = [makeEpisode({ '@timestamp': '2024-01-01T03:00:00.000Z', 'episode.id': 'v2-1' })];
    const v1 = [makeEpisode({ '@timestamp': '2024-01-01T01:00:00.000Z', 'episode.id': 'v1-1' })];

    const result = mergeEpisodes(v2, v1, { sortField: '@timestamp', sortDirection: 'asc' }, 10);

    expect(result[0]['episode.id']).toBe('v1-1');
    expect(result[1]['episode.id']).toBe('v2-1');
  });

  it('limits the result to pageSize', () => {
    const v2 = Array.from({ length: 5 }, (_, i) =>
      makeEpisode({ '@timestamp': `2024-01-01T0${i}:00:00.000Z`, 'episode.id': `v2-${i}` })
    );
    const v1 = Array.from({ length: 5 }, (_, i) =>
      makeEpisode({ '@timestamp': `2024-01-02T0${i}:00:00.000Z`, 'episode.id': `v1-${i}` })
    );

    const result = mergeEpisodes(v2, v1, defaultSort, 3);
    expect(result).toHaveLength(3);
  });

  it('handles empty v1 array', () => {
    const v2 = [makeEpisode({ 'episode.id': 'v2-only' })];
    const result = mergeEpisodes(v2, [], defaultSort, 10);

    expect(result).toHaveLength(1);
    expect(result[0]['episode.id']).toBe('v2-only');
  });

  it('handles empty v2 array', () => {
    const v1 = [makeEpisode({ 'episode.id': 'v1-only', supports_actions: false })];
    const result = mergeEpisodes([], v1, defaultSort, 10);

    expect(result).toHaveLength(1);
    expect(result[0]['episode.id']).toBe('v1-only');
  });

  it('sorts by severity correctly', () => {
    const v2 = [makeEpisode({ 'episode.id': 'low', severity: 'low' })];
    const v1 = [makeEpisode({ 'episode.id': 'critical', severity: 'critical' })];

    const result = mergeEpisodes(v2, v1, { sortField: 'severity', sortDirection: 'desc' }, 10);

    expect(result[0]['episode.id']).toBe('critical');
    expect(result[1]['episode.id']).toBe('low');
  });

  it('sorts by duration numerically', () => {
    const v2 = [makeEpisode({ 'episode.id': 'short', duration: 100 })];
    const v1 = [makeEpisode({ 'episode.id': 'long', duration: 9999 })];

    const result = mergeEpisodes(v2, v1, { sortField: 'duration', sortDirection: 'desc' }, 10);

    expect(result[0]['episode.id']).toBe('long');
    expect(result[1]['episode.id']).toBe('short');
  });

  it('sorts chronologically when v2 timestamps are epoch ms and v1 are ISO strings', () => {
    // ES|QL often returns dates as epoch millis; classic RAC rows map to ISO strings.
    const v2Newer = makeEpisode({
      'episode.id': 'v2-newer',
      '@timestamp': Date.parse('2024-07-03T10:03:20.000Z') as unknown as string,
    });
    const v2Older = makeEpisode({
      'episode.id': 'v2-older',
      '@timestamp': Date.parse('2024-07-03T09:46:40.000Z') as unknown as string,
    });
    const v1Newer = makeEpisode({
      'episode.id': 'v1-newer',
      '@timestamp': '2024-07-03T12:00:00.000Z',
      supports_actions: false,
    });
    const v1Older = makeEpisode({
      'episode.id': 'v1-older',
      '@timestamp': '2024-07-03T10:00:00.000Z',
      supports_actions: false,
    });

    const result = mergeEpisodes([v2Newer, v2Older], [v1Newer, v1Older], defaultSort, 10);

    expect(result.map((ep) => ep['episode.id'])).toEqual([
      'v1-newer',
      'v2-newer',
      'v1-older',
      'v2-older',
    ]);
  });
});
