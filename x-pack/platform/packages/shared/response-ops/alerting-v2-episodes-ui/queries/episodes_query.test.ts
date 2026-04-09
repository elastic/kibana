/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodesBaseQuery, buildEpisodesQuery } from './episodes_query';
import { PAGE_SIZE_ESQL_VARIABLE, ALERT_EVENTS_DATA_STREAM } from '../constants';

describe('buildEpisodesBaseQuery', () => {
  it('should build query with correct structure', () => {
    const query = buildEpisodesBaseQuery();
    const queryString = query.print('basic');

    // Selects FROM the correct data stream
    expect(queryString).toContain(`FROM ${ALERT_EVENTS_DATA_STREAM}`);

    // Filters for alert type events
    expect(queryString).toContain('type == "alert"');

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

describe('buildEpisodesQuery', () => {
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

  it('should apply status filter', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { status: 'active' }
    );
    const queryString = query.print('basic');

    expect(queryString).toContain('WHERE episode.status == "active"');
  });

  it('should apply ruleId filter', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { ruleId: 'rule-123' }
    );
    const queryString = query.print('basic');

    expect(queryString).toContain('WHERE rule.id == "rule-123"');
  });

  it('should apply queryString filter with QSTR', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { queryString: 'alert.name: "test"' }
    );
    const queryString = query.print('basic');

    expect(queryString).toContain('QSTR("alert.name: \\"test\\"")');
  });

  it('should apply multiple filters together', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      {
        queryString: 'alert.name: "test"',
        status: 'active',
        ruleId: 'rule-123',
      }
    );
    const queryString = query.print('basic');

    expect(queryString).toContain('QSTR("alert.name: \\"test\\"")');
    expect(queryString).toContain('WHERE episode.status == "active"');
    expect(queryString).toContain('WHERE rule.id == "rule-123"');
  });

  it('should trim queryString before applying', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { queryString: '  alert.name: "test"  ' }
    );
    const queryString = query.print('basic');

    expect(queryString).toContain('QSTR("alert.name: \\"test\\"")');
  });

  it('should not apply filters when they are null or undefined', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { queryString: null, status: null, ruleId: undefined }
    );
    const queryString = query.print('basic');

    // Should only have the base WHERE clauses from buildEpisodesBaseQuery
    const whereCount = (queryString.match(/WHERE/g) || []).length;
    expect(whereCount).toBe(2); // "type == alert" and "@timestamp == last_timestamp"
  });

  it('should not apply queryString filter when it is empty or whitespace', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { queryString: '   ' }
    );
    const queryString = query.print('basic');

    expect(queryString).not.toContain('QSTR');
  });
});
