/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_TIME_FIELD } from '@kbn/alerting-v2-constants';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { buildEpisodeEventsQuery } from './episode_events_query';

const SPACE_ID = 'default';

describe('buildEpisodeEventsQuery', () => {
  it('filters by episode id and sorts by time ascending', () => {
    const episodeId = 'episode-xyz';
    const queryString = buildEpisodeEventsQuery(SPACE_ID, episodeId).print('basic');
    expect(queryString).toContain('episode.id');
    expect(queryString).toContain(episodeId);
    expect(queryString).toContain(`SORT ${DEFAULT_TIME_FIELD} ASC`);
    expect(queryString).toContain(
      'KEEP @timestamp, `episode.id`, `episode.status`, `rule.id`, group_hash, severity, source, data'
    );
    expect(queryString).toContain('type == "alert"');
    expect(queryString).not.toContain('@timestamp >=');
    expect(queryString).not.toContain('episode.status ==');
    expect(queryString).not.toContain('LIMIT');
  });

  it('applies an inclusive time-range filter when provided', () => {
    const queryString = buildEpisodeEventsQuery(SPACE_ID, 'episode-xyz', {
      timeRange: {
        start: '2026-04-10T11:00:00.000Z',
        end: '2026-04-10T12:00:00.000Z',
      },
    }).print('basic');
    expect(queryString).toContain('@timestamp >= "2026-04-10T11:00:00.000Z"');
    expect(queryString).toContain('@timestamp <= "2026-04-10T12:00:00.000Z"');
  });

  it('applies an episode.status filter when provided', () => {
    const queryString = buildEpisodeEventsQuery(SPACE_ID, 'episode-xyz', {
      status: ALERT_EPISODE_STATUS.ACTIVE,
    }).print('basic');
    expect(queryString).toContain(`episode.status == "${ALERT_EPISODE_STATUS.ACTIVE}"`);
  });

  it('applies an explicit LIMIT when provided', () => {
    const queryString = buildEpisodeEventsQuery(SPACE_ID, 'episode-xyz', {
      limit: 1001,
    }).print('basic');
    expect(queryString).toContain('LIMIT 1001');
  });
});
