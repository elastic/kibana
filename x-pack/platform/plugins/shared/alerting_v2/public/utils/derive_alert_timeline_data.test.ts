/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import {
  deriveAlertTimelineData,
  type AlertTimelineSummary,
  type AlertTimelineEventRow,
} from '@kbn/alerting-v2-episodes-ui/alert_timeline';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const T0 = Date.UTC(2026, 3, 1, 0, 0, 0); // 2026-04-01
const NOW = T0 + 7 * DAY_MS;

const STUB_SUMMARY: AlertTimelineSummary = {
  episodesStarted: 0,
  recovered: 0,
  stillOpen: 0,
  medianDurationMs: 0,
};

interface EventSpec {
  episodeId: string;
  groupHash?: string;
  status: AlertEpisodeStatus;
  tsMs: number;
}

const event = ({
  episodeId,
  groupHash = 'gh-A',
  status,
  tsMs,
}: EventSpec): AlertTimelineEventRow => ({
  '@timestamp': new Date(tsMs).toISOString(),
  'episode.id': episodeId,
  'episode.status': status,
  group_hash: groupHash,
});

describe('deriveAlertTimelineData', () => {
  it('emits one segment per event-pair within an episode and a transition per event', () => {
    const events: AlertTimelineEventRow[] = [
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.PENDING, tsMs: T0 }),
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 + HOUR_MS }),
      event({
        episodeId: 'ep-1',
        status: ALERT_EPISODE_STATUS.RECOVERING,
        tsMs: T0 + 2 * HOUR_MS,
      }),
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.INACTIVE, tsMs: T0 + 3 * HOUR_MS }),
    ];

    const result = deriveAlertTimelineData(events, {}, 'started_asc', T0, NOW, STUB_SUMMARY, 1);
    const row = result.rows[0];

    expect(row.segments).toEqual([
      {
        episodeId: 'ep-1',
        status: ALERT_EPISODE_STATUS.PENDING,
        x0Ms: T0,
        x1Ms: T0 + HOUR_MS,
      },
      {
        episodeId: 'ep-1',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        x0Ms: T0 + HOUR_MS,
        x1Ms: T0 + 2 * HOUR_MS,
      },
      {
        episodeId: 'ep-1',
        status: ALERT_EPISODE_STATUS.RECOVERING,
        x0Ms: T0 + 2 * HOUR_MS,
        x1Ms: T0 + 3 * HOUR_MS,
      },
    ]);
    expect(row.transitions.map((t) => t.status)).toEqual([
      ALERT_EPISODE_STATUS.PENDING,
      ALERT_EPISODE_STATUS.ACTIVE,
      ALERT_EPISODE_STATUS.RECOVERING,
      ALERT_EPISODE_STATUS.INACTIVE,
    ]);
    expect(row.hasOpenEpisode).toBe(false);
  });

  it('emits a transition only when the status actually changes', () => {
    const events: AlertTimelineEventRow[] = [
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 }),
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 + HOUR_MS }),
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 + 2 * HOUR_MS }),
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.INACTIVE, tsMs: T0 + 3 * HOUR_MS }),
    ];

    const result = deriveAlertTimelineData(events, {}, 'started_asc', T0, NOW, STUB_SUMMARY, 1);

    expect(result.rows[0].transitions).toEqual([
      { episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 },
      { episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.INACTIVE, tsMs: T0 + 3 * HOUR_MS },
    ]);
  });

  it('coalesces consecutive same-status events within an episode into one segment', () => {
    const events: AlertTimelineEventRow[] = [
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 }),
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 + HOUR_MS }),
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 + 2 * HOUR_MS }),
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.INACTIVE, tsMs: T0 + 3 * HOUR_MS }),
    ];

    const result = deriveAlertTimelineData(events, {}, 'started_asc', T0, NOW, STUB_SUMMARY, 1);

    expect(result.rows[0].segments).toEqual([
      {
        episodeId: 'ep-1',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        x0Ms: T0,
        x1Ms: T0 + 3 * HOUR_MS,
      },
    ]);
  });

  it('extends the tail segment to lteMs for open episodes and tracks longest open', () => {
    const events: AlertTimelineEventRow[] = [
      event({ episodeId: 'open-long', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 }),
      event({
        episodeId: 'open-short',
        status: ALERT_EPISODE_STATUS.PENDING,
        tsMs: T0 + 6 * HOUR_MS,
      }),
    ];

    const summary: AlertTimelineSummary = {
      episodesStarted: 2,
      recovered: 0,
      stillOpen: 2,
      medianDurationMs: 0,
    };
    const result = deriveAlertTimelineData(events, {}, 'started_asc', T0, NOW, summary, 1);
    const row = result.rows[0];

    expect(row.hasOpenEpisode).toBe(true);
    expect(row.longestOpenDurationMs).toBe(NOW - T0);
    const tail = row.segments.find((s) => s.episodeId === 'open-long');
    expect(tail).toEqual({
      episodeId: 'open-long',
      status: ALERT_EPISODE_STATUS.ACTIVE,
      x0Ms: T0,
      x1Ms: NOW,
    });
    expect(result.summary.stillOpen).toBe(2);
    expect(result.summary.recovered).toBe(0);
  });

  it('groups events by group_hash into separate lanes', () => {
    const events: AlertTimelineEventRow[] = [
      event({
        episodeId: 'ep-1',
        groupHash: 'gh-A',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        tsMs: T0,
      }),
      event({
        episodeId: 'ep-1',
        groupHash: 'gh-A',
        status: ALERT_EPISODE_STATUS.INACTIVE,
        tsMs: T0 + HOUR_MS,
      }),
      event({
        episodeId: 'ep-2',
        groupHash: 'gh-B',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        tsMs: T0 + 2 * HOUR_MS,
      }),
      event({
        episodeId: 'ep-2',
        groupHash: 'gh-B',
        status: ALERT_EPISODE_STATUS.INACTIVE,
        tsMs: T0 + 3 * HOUR_MS,
      }),
    ];

    const result = deriveAlertTimelineData(events, {}, 'started_asc', T0, NOW, STUB_SUMMARY, 2);

    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.groupHash)).toEqual(['gh-A', 'gh-B']);
  });

  it('reports hiddenRowCount from totalSeriesCount vs rendered rows', () => {
    const events: AlertTimelineEventRow[] = [];
    for (let i = 0; i < 8; i++) {
      events.push(
        event({
          episodeId: `ep-${i}`,
          groupHash: `gh-${i}`,
          status: ALERT_EPISODE_STATUS.ACTIVE,
          tsMs: T0 + i * HOUR_MS,
        }),
        event({
          episodeId: `ep-${i}`,
          groupHash: `gh-${i}`,
          status: ALERT_EPISODE_STATUS.INACTIVE,
          tsMs: T0 + i * HOUR_MS + 30 * 60_000,
        })
      );
    }

    const result = deriveAlertTimelineData(events, {}, 'started_asc', T0, NOW, STUB_SUMMARY, 12);

    expect(result.rows).toHaveLength(8);
    expect(result.hiddenRowCount).toBe(4);
    expect(result.totalRowCount).toBe(12);
  });

  it('passes through externally-supplied summary unchanged', () => {
    const events: AlertTimelineEventRow[] = [
      event({ episodeId: 'r1', groupHash: 'gh-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 }),
      event({
        episodeId: 'r1',
        groupHash: 'gh-1',
        status: ALERT_EPISODE_STATUS.INACTIVE,
        tsMs: T0 + HOUR_MS,
      }),
    ];

    const summary: AlertTimelineSummary = {
      episodesStarted: 3,
      recovered: 2,
      stillOpen: 1,
      medianDurationMs: 2 * HOUR_MS,
    };

    const result = deriveAlertTimelineData(events, {}, 'started_asc', T0, NOW, summary, 3);

    expect(result.summary).toBe(summary);
  });

  it('attaches groupingValues from the lookup map', () => {
    const events: AlertTimelineEventRow[] = [
      event({
        episodeId: 'ep-1',
        groupHash: 'gh-A',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        tsMs: T0,
      }),
      event({
        episodeId: 'ep-1',
        groupHash: 'gh-A',
        status: ALERT_EPISODE_STATUS.INACTIVE,
        tsMs: T0 + HOUR_MS,
      }),
    ];

    const result = deriveAlertTimelineData(
      events,
      { 'gh-A': { 'host.name': 'web-01' } },
      'started_asc',
      T0,
      NOW,
      STUB_SUMMARY,
      1
    );

    expect(result.rows[0].groupingValues).toEqual({ 'host.name': 'web-01' });
  });

  it('sorts by recently_active and longest_open as expected', () => {
    const events: AlertTimelineEventRow[] = [
      event({
        episodeId: 'old',
        groupHash: 'gh-old',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        tsMs: T0,
      }),
      event({
        episodeId: 'old',
        groupHash: 'gh-old',
        status: ALERT_EPISODE_STATUS.INACTIVE,
        tsMs: T0 + HOUR_MS,
      }),
      event({
        episodeId: 'recent',
        groupHash: 'gh-recent',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        tsMs: T0 + 2 * DAY_MS,
      }),
      event({
        episodeId: 'recent',
        groupHash: 'gh-recent',
        status: ALERT_EPISODE_STATUS.INACTIVE,
        tsMs: T0 + 2 * DAY_MS + HOUR_MS,
      }),
      event({
        episodeId: 'long-open',
        groupHash: 'gh-long-open',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        tsMs: T0,
      }),
      event({
        episodeId: 'long-open',
        groupHash: 'gh-long-open',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        tsMs: T0 + 3 * DAY_MS,
      }),
    ];

    expect(
      deriveAlertTimelineData(events, {}, 'recently_active', T0, NOW, STUB_SUMMARY, 3).rows.map(
        (r) => r.groupHash
      )
    ).toEqual(['gh-long-open', 'gh-recent', 'gh-old']);
    expect(
      deriveAlertTimelineData(events, {}, 'longest_open', T0, NOW, STUB_SUMMARY, 3).rows.map(
        (r) => r.groupHash
      )[0]
    ).toBe('gh-long-open');
  });

  it('uses pre-window events as a lookback buffer: clips segments to gteMs and suppresses pre-window transitions', () => {
    const VISIBLE_GTE = T0 + 4 * HOUR_MS;
    const VISIBLE_LTE = T0 + 8 * HOUR_MS;

    const events: AlertTimelineEventRow[] = [
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 + 2 * HOUR_MS }),
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 + 3 * HOUR_MS }),
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 + 5 * HOUR_MS }),
      event({
        episodeId: 'ep-1',
        status: ALERT_EPISODE_STATUS.RECOVERING,
        tsMs: T0 + 6 * HOUR_MS,
      }),
      event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.INACTIVE, tsMs: T0 + 7 * HOUR_MS }),
    ];

    const result = deriveAlertTimelineData(
      events,
      {},
      'started_asc',
      VISIBLE_GTE,
      VISIBLE_LTE,
      STUB_SUMMARY,
      1
    );
    const row = result.rows[0];

    expect(row.segments).toEqual([
      {
        episodeId: 'ep-1',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        x0Ms: VISIBLE_GTE,
        x1Ms: T0 + 6 * HOUR_MS,
      },
      {
        episodeId: 'ep-1',
        status: ALERT_EPISODE_STATUS.RECOVERING,
        x0Ms: T0 + 6 * HOUR_MS,
        x1Ms: T0 + 7 * HOUR_MS,
      },
    ]);

    expect(row.transitions.map((t) => ({ status: t.status, tsMs: t.tsMs }))).toEqual([
      { status: ALERT_EPISODE_STATUS.RECOVERING, tsMs: T0 + 6 * HOUR_MS },
      { status: ALERT_EPISODE_STATUS.INACTIVE, tsMs: T0 + 7 * HOUR_MS },
    ]);
  });

  describe('start anchors', () => {
    it('prepends a flat fill from an anchor before gteMs, clipped so the bar starts at gteMs', () => {
      const events: AlertTimelineEventRow[] = [
        event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 + 3 * HOUR_MS }),
        event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.INACTIVE, tsMs: T0 + 5 * HOUR_MS }),
      ];
      // Episode actually started 2h before the visible window.
      const anchorByEpisode = new Map([['ep-1', T0 - 2 * HOUR_MS]]);

      const result = deriveAlertTimelineData(
        events,
        {},
        'started_asc',
        T0,
        NOW,
        STUB_SUMMARY,
        1,
        anchorByEpisode
      );
      const row = result.rows[0];

      // The flat fill (active) coalesces with the first real active segment and
      // is clipped to gteMs — no gap at the left edge.
      expect(row.segments).toEqual([
        {
          episodeId: 'ep-1',
          status: ALERT_EPISODE_STATUS.ACTIVE,
          x0Ms: T0,
          x1Ms: T0 + 5 * HOUR_MS,
        },
      ]);
      // The synthetic start carries no dot; only the real recovery remains.
      expect(row.transitions.map((t) => t.status)).toEqual([ALERT_EPISODE_STATUS.INACTIVE]);
    });

    it('fills with the first fetched event status and emits no dot at the fetch boundary', () => {
      const events: AlertTimelineEventRow[] = [
        event({
          episodeId: 'ep-1',
          status: ALERT_EPISODE_STATUS.RECOVERING,
          tsMs: T0 + 4 * HOUR_MS,
        }),
        event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.INACTIVE, tsMs: T0 + 5 * HOUR_MS }),
      ];
      const anchorByEpisode = new Map([['ep-1', T0 + 1 * HOUR_MS]]);

      const result = deriveAlertTimelineData(
        events,
        {},
        'started_asc',
        T0,
        NOW,
        STUB_SUMMARY,
        1,
        anchorByEpisode
      );
      const row = result.rows[0];

      expect(row.segments).toEqual([
        {
          episodeId: 'ep-1',
          status: ALERT_EPISODE_STATUS.RECOVERING,
          x0Ms: T0 + 1 * HOUR_MS,
          x1Ms: T0 + 5 * HOUR_MS,
        },
      ]);
      expect(row.transitions.map((t) => t.status)).toEqual([ALERT_EPISODE_STATUS.INACTIVE]);
    });

    it('does not prepend a flat segment when the anchor equals the first fetched event', () => {
      const events: AlertTimelineEventRow[] = [
        event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.ACTIVE, tsMs: T0 + 2 * HOUR_MS }),
        event({ episodeId: 'ep-1', status: ALERT_EPISODE_STATUS.INACTIVE, tsMs: T0 + 4 * HOUR_MS }),
      ];
      const anchorByEpisode = new Map([['ep-1', T0 + 2 * HOUR_MS]]);

      const result = deriveAlertTimelineData(
        events,
        {},
        'started_asc',
        T0,
        NOW,
        STUB_SUMMARY,
        1,
        anchorByEpisode
      );
      const row = result.rows[0];

      // Bar starts at the first real event; its start dot is preserved.
      expect(row.segments).toEqual([
        {
          episodeId: 'ep-1',
          status: ALERT_EPISODE_STATUS.ACTIVE,
          x0Ms: T0 + 2 * HOUR_MS,
          x1Ms: T0 + 4 * HOUR_MS,
        },
      ]);
      expect(row.transitions.map((t) => t.status)).toEqual([
        ALERT_EPISODE_STATUS.ACTIVE,
        ALERT_EPISODE_STATUS.INACTIVE,
      ]);
    });

    it('anchors each episode independently within a single lane (#272984 regression)', () => {
      const events: AlertTimelineEventRow[] = [
        // Older completed episode.
        event({
          episodeId: 'ep-old',
          groupHash: 'gh-A',
          status: ALERT_EPISODE_STATUS.ACTIVE,
          tsMs: T0 + 2 * HOUR_MS,
        }),
        event({
          episodeId: 'ep-old',
          groupHash: 'gh-A',
          status: ALERT_EPISODE_STATUS.INACTIVE,
          tsMs: T0 + 3 * HOUR_MS,
        }),
        // Busy active episode whose earlier events were truncated by the per-episode cap.
        event({
          episodeId: 'ep-new',
          groupHash: 'gh-A',
          status: ALERT_EPISODE_STATUS.ACTIVE,
          tsMs: T0 + 20 * HOUR_MS,
        }),
      ];
      const anchorByEpisode = new Map([
        ['ep-old', T0 + 1 * HOUR_MS],
        ['ep-new', T0 + 10 * HOUR_MS],
      ]);

      const result = deriveAlertTimelineData(
        events,
        {},
        'started_asc',
        T0,
        NOW,
        STUB_SUMMARY,
        1,
        anchorByEpisode
      );
      const row = result.rows[0];

      // Both episodes render in the same lane — the busy one does not starve the old one.
      expect(new Set(row.segments.map((s) => s.episodeId))).toEqual(new Set(['ep-old', 'ep-new']));

      // ep-new's truncated left edge is restored back to its anchor and runs open to lteMs.
      expect(row.segments.find((s) => s.episodeId === 'ep-new')).toEqual({
        episodeId: 'ep-new',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        x0Ms: T0 + 10 * HOUR_MS,
        x1Ms: NOW,
      });
      // ep-old keeps its flat-filled start.
      expect(row.segments.find((s) => s.episodeId === 'ep-old')).toEqual({
        episodeId: 'ep-old',
        status: ALERT_EPISODE_STATUS.ACTIVE,
        x0Ms: T0 + 1 * HOUR_MS,
        x1Ms: T0 + 3 * HOUR_MS,
      });
    });
  });
});
