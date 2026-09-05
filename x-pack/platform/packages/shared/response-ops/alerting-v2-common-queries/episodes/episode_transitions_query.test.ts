/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { buildEpisodeTransitionsQuery } from './episode_transitions_query';

const SPACE_ID = 'space-a';
const EPISODE_ID = 'episode-abc';

describe('buildEpisodeTransitionsQuery', () => {
  it('queries rule events with _id metadata and filters to the episode', () => {
    const queryString = buildEpisodeTransitionsQuery(SPACE_ID, EPISODE_ID).print('basic');
    expect(queryString).toContain(ALERT_EVENTS_DATA_STREAM);
    expect(queryString).toContain('METADATA _id');
    expect(queryString).toContain(`space_id == "${SPACE_ID}"`);
    expect(queryString).toContain(`episode.id == "${EPISODE_ID}"`);
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain('episode.status');
    expect(queryString).toContain('IS NOT NULL');
  });

  it('collapses consecutive same-status events into transitions with duration', () => {
    const queryString = buildEpisodeTransitionsQuery(SPACE_ID, EPISODE_ID).print('basic');
    expect(queryString).toContain('DATE_FORMAT("yyyyMMddHHmmssSSS"');
    expect(queryString).toContain('VALUES(_entry)');
    expect(queryString).toContain('MV_EXPAND _candidates');
    expect(queryString).toContain('SUBSTRING(_prev, 18)');
    expect(queryString).toContain('previous_status != `episode.status`');
    expect(queryString).toContain('DATE_DIFF("ms"');
    expect(queryString).toContain('COALESCE(status_ended_at, episode_latest_ts)');
  });

  it('projects transition fields and sorts by start time', () => {
    const queryString = buildEpisodeTransitionsQuery(SPACE_ID, EPISODE_ID).print('basic');
    expect(queryString).toContain('RENAME @timestamp AS status_started_at');
    expect(queryString).toContain('`episode.status` AS episode_status');
    expect(queryString).toContain('KEEP');
    expect(queryString).toContain('status_started_at');
    expect(queryString).toContain('previous_status');
    expect(queryString).toContain('episode_status');
    expect(queryString).toContain('duration_ms');
    expect(queryString).toContain('status_ended_at');
    expect(queryString).toContain('SORT `episode.id` ASC, status_started_at ASC');
  });
});
