/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { deriveAlertTimelineDataFromEvents } from './derive_alert_timeline_events';

const START_MS = Date.parse('2026-04-01T00:00:00.000Z');
const summary = { episodesStarted: 1, recovered: 1, stillOpen: 0, medianDurationMs: 3_000 };

describe('deriveAlertTimelineDataFromEvents', () => {
  it('collapses heartbeats while preserving repeated status transitions', () => {
    const events = [
      { status: ALERT_EPISODE_STATUS.ACTIVE, offsetMs: 0 },
      { status: ALERT_EPISODE_STATUS.ACTIVE, offsetMs: 500 },
      { status: ALERT_EPISODE_STATUS.RECOVERING, offsetMs: 1_000 },
      { status: ALERT_EPISODE_STATUS.ACTIVE, offsetMs: 2_000 },
      { status: ALERT_EPISODE_STATUS.INACTIVE, offsetMs: 3_000 },
    ].map(({ status, offsetMs }) => ({
      '@timestamp': new Date(START_MS + offsetMs).toISOString(),
      'episode.id': 'episode-1',
      'episode.status': status,
      group_hash: 'group-1',
    }));

    const result = deriveAlertTimelineDataFromEvents(
      events,
      {},
      'started_asc',
      START_MS,
      START_MS + 3_000,
      summary
    );

    expect(result.rows[0]?.transitions.map(({ status }) => status)).toEqual([
      ALERT_EPISODE_STATUS.ACTIVE,
      ALERT_EPISODE_STATUS.RECOVERING,
      ALERT_EPISODE_STATUS.ACTIVE,
      ALERT_EPISODE_STATUS.INACTIVE,
    ]);
  });
});
