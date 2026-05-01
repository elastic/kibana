/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { deriveGanttData } from './derive_gantt_data';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const T0 = Date.UTC(2026, 3, 1, 0, 0, 0); // 2026-04-01

const buildEpisode = (overrides: Partial<AlertEpisode> & { firstMs: number; lastMs: number }) => {
  const { firstMs, lastMs, ...rest } = overrides;
  return {
    '@timestamp': new Date(lastMs).toISOString(),
    'episode.id': 'ep-1',
    'episode.status': ALERT_EPISODE_STATUS.INACTIVE,
    'rule.id': 'rule-1',
    group_hash: 'gh-1',
    first_timestamp: new Date(firstMs).toISOString(),
    last_timestamp: new Date(lastMs).toISOString(),
    duration: lastMs - firstMs,
    ...rest,
  } as AlertEpisode;
};

describe('deriveGanttData', () => {
  it('groups episodes by group_hash and sorts episodes asc within each row', () => {
    const episodes: AlertEpisode[] = [
      buildEpisode({
        'episode.id': 'ep-2',
        group_hash: 'gh-A',
        firstMs: T0 + 2 * HOUR_MS,
        lastMs: T0 + 3 * HOUR_MS,
      }),
      buildEpisode({
        'episode.id': 'ep-1',
        group_hash: 'gh-A',
        firstMs: T0,
        lastMs: T0 + HOUR_MS,
      }),
      buildEpisode({
        'episode.id': 'ep-3',
        group_hash: 'gh-B',
        firstMs: T0 + HOUR_MS,
        lastMs: T0 + 2 * HOUR_MS,
      }),
    ];

    const result = deriveGanttData(episodes, {}, 'started_asc');

    expect(result.totalRowCount).toBe(2);
    expect(result.rows.map((r) => r.groupHash)).toEqual(['gh-A', 'gh-B']);
    expect(result.rows[0].episodes.map((e) => e.episodeId)).toEqual(['ep-1', 'ep-2']);
  });

  it('classifies non-inactive statuses as open and tracks longest open duration', () => {
    const episodes: AlertEpisode[] = [
      buildEpisode({
        'episode.id': 'open-long',
        group_hash: 'gh-A',
        'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
        firstMs: T0,
        lastMs: T0 + 5 * HOUR_MS,
      }),
      buildEpisode({
        'episode.id': 'open-short',
        group_hash: 'gh-A',
        'episode.status': ALERT_EPISODE_STATUS.PENDING,
        firstMs: T0 + 6 * HOUR_MS,
        lastMs: T0 + 7 * HOUR_MS,
      }),
    ];

    const result = deriveGanttData(episodes, {}, 'started_asc');

    expect(result.rows[0].hasOpenEpisode).toBe(true);
    expect(result.rows[0].longestOpenDurationMs).toBe(5 * HOUR_MS);
    expect(result.rows[0].episodes.every((e) => e.isOpen)).toBe(true);
    expect(result.summary.stillOpen).toBe(2);
    expect(result.summary.recovered).toBe(0);
  });

  it('caps visible rows at topN and reports hiddenRowCount', () => {
    const episodes: AlertEpisode[] = Array.from({ length: 12 }, (_, i) =>
      buildEpisode({
        'episode.id': `ep-${i}`,
        group_hash: `gh-${i}`,
        firstMs: T0 + i * HOUR_MS,
        lastMs: T0 + (i + 1) * HOUR_MS,
      })
    );

    const result = deriveGanttData(episodes, {}, 'started_asc', 8);

    expect(result.rows).toHaveLength(8);
    expect(result.hiddenRowCount).toBe(4);
    expect(result.totalRowCount).toBe(12);
  });

  it('computes summary stats with median duration over recovered episodes only', () => {
    const episodes: AlertEpisode[] = [
      buildEpisode({
        'episode.id': 'r1',
        firstMs: T0,
        lastMs: T0 + HOUR_MS, // 1h
      }),
      buildEpisode({
        'episode.id': 'r2',
        group_hash: 'gh-2',
        firstMs: T0,
        lastMs: T0 + 3 * HOUR_MS, // 3h
      }),
      buildEpisode({
        'episode.id': 'r3',
        group_hash: 'gh-3',
        firstMs: T0,
        lastMs: T0 + 5 * HOUR_MS, // 5h — open, excluded from median
        'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
      }),
    ];

    const result = deriveGanttData(episodes, {}, 'started_asc');

    expect(result.summary.episodesStarted).toBe(3);
    expect(result.summary.recovered).toBe(2);
    expect(result.summary.stillOpen).toBe(1);
    expect(result.summary.medianDurationMs).toBe(2 * HOUR_MS); // (1h + 3h) / 2
  });

  it('attaches groupingValues from the lookup map', () => {
    const episodes: AlertEpisode[] = [
      buildEpisode({ group_hash: 'gh-A', firstMs: T0, lastMs: T0 + HOUR_MS }),
    ];

    const result = deriveGanttData(episodes, { 'gh-A': { 'host.name': 'web-01' } }, 'started_asc');

    expect(result.rows[0].groupingValues).toEqual({ 'host.name': 'web-01' });
  });

  it('sorts by recently_active and longest_open as expected', () => {
    const episodes: AlertEpisode[] = [
      buildEpisode({
        group_hash: 'gh-old',
        firstMs: T0,
        lastMs: T0 + HOUR_MS,
      }),
      buildEpisode({
        group_hash: 'gh-recent',
        firstMs: T0 + 2 * DAY_MS,
        lastMs: T0 + 2 * DAY_MS + HOUR_MS,
      }),
      buildEpisode({
        group_hash: 'gh-long-open',
        'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
        firstMs: T0,
        lastMs: T0 + 3 * DAY_MS,
      }),
    ];

    expect(deriveGanttData(episodes, {}, 'recently_active').rows.map((r) => r.groupHash)).toEqual([
      'gh-long-open',
      'gh-recent',
      'gh-old',
    ]);
    expect(deriveGanttData(episodes, {}, 'longest_open').rows.map((r) => r.groupHash)[0]).toBe(
      'gh-long-open'
    );
  });
});
