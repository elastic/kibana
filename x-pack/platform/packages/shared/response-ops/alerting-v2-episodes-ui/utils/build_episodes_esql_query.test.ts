/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEpisodesBaseQuery,
  buildEpisodesQuery,
  buildEpisodesCountQuery,
} from './build_episodes_esql_query';
import {
  LAST_EPISODE_TIMESTAMP_ESQL_VARIABLE,
  PAGE_SIZE_ESQL_VARIABLE,
  ALERT_EVENTS_DATA_STREAM,
} from '../constants';

describe('buildEpisodesBaseQuery', () => {
  it('should build query with correct structure', () => {
    const query = buildEpisodesBaseQuery();
    const queryString = query.print('basic');

    // Selects FROM the correct data stream
    expect(queryString).toContain(`FROM ${ALERT_EVENTS_DATA_STREAM}`);

    // Filters for alert type events
    expect(queryString).toContain('type == "alert"');

    // Contains the correct timestamp-based cursor WHERE clause
    expect(queryString).toContain(`?${LAST_EPISODE_TIMESTAMP_ESQL_VARIABLE}`);
    expect(queryString).toContain('IS NULL');
    expect(queryString).toContain('@timestamp <');

    // Contains the correct INLINE STATS and grouping
    expect(queryString).toContain('INLINE STATS');
    expect(queryString).toContain('first_timestamp = MIN(@timestamp)');
    expect(queryString).toContain('last_timestamp = MAX(@timestamp)');
    expect(queryString).toContain('BY episode.id');

    // Calculates the duration
    expect(queryString).toContain('EVAL duration = DATE_DIFF');
    expect(queryString).toContain('"ms"');
    expect(queryString).toContain('first_timestamp');
    expect(queryString).toContain('last_timestamp');

    // Selects the last timestamp in the series of events
    expect(queryString).toContain('WHERE @timestamp == last_timestamp');
  });
});

describe('buildEpisodesPaginatedQuery', () => {
  it('should build query with default sort', () => {
    const query = buildEpisodesQuery();
    const queryString = query.print('basic');

    // Default sort is @timestamp DESC
    expect(queryString).toContain('SORT @timestamp DESC');

    // Adds the page size variable correctly to the LIMIT clause
    expect(queryString).toContain(`LIMIT ?${PAGE_SIZE_ESQL_VARIABLE}`);
  });

  it('should correctly sanitize and apply custom sort', () => {
    const query = buildEpisodesQuery({
      sortField: 'episode.id',
      sortDirection: 'asc',
    });
    const queryString = query.print('basic');

    // Correctly sanitizes the sort field (episode.id is allowlisted)
    expect(queryString).toContain('episode.id');

    // Outputs the correct sort direction keyword
    expect(queryString).toContain('SORT `episode.id` ASC');
  });

  it('should sanitize invalid sort fields to @timestamp', () => {
    const query = buildEpisodesQuery({
      sortField: 'invalid.field',
      sortDirection: 'desc',
    });
    const queryString = query.print('basic');

    // Falls back to @timestamp
    expect(queryString).toContain('SORT @timestamp DESC');
    expect(queryString).not.toContain('invalid.field');
  });

  it('should handle all allowlisted sort fields', () => {
    const allowlistedFields = ['@timestamp', 'episode.id', 'episode.status', 'rule.id', 'duration'];

    allowlistedFields.forEach((field) => {
      const query = buildEpisodesQuery({
        sortField: field,
        sortDirection: 'asc',
      });
      const queryString = query.print('basic');

      expect(queryString).toMatch(new RegExp(`SORT \`?${field.replace('.', '\\.')}\`? ASC`));
    });
  });
});

describe('buildEpisodesCountQuery', () => {
  it('should build count query with correct structure', () => {
    const query = buildEpisodesCountQuery();
    const queryString = query.print('basic');

    // Starts from the correct base query (alert events, not episodes base)
    expect(queryString).toContain(`FROM ${ALERT_EVENTS_DATA_STREAM}`);
    expect(queryString).toContain('type == "alert"');

    // Should NOT contain pagination structures
    expect(queryString).not.toContain('LIMIT');
    expect(queryString).not.toContain(PAGE_SIZE_ESQL_VARIABLE);

    // Should NOT contain the episodes aggregation logic
    expect(queryString).not.toContain('INLINE STATS');
    expect(queryString).not.toContain('duration');

    // Calculates the total count of episodes
    expect(queryString).toContain('STATS total = COUNT_DISTINCT(episode.id)');
  });
});
