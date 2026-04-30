/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodesBaseQuery, buildEpisodesQuery } from './episodes_query';
import {
  PAGE_SIZE_ESQL_VARIABLE,
  ALERT_EVENTS_DATA_STREAM,
  ALERT_ACTIONS_DATA_STREAM,
} from '../constants';

describe('buildEpisodesBaseQuery', () => {
  it('should build query with correct structure', () => {
    const query = buildEpisodesBaseQuery();
    const queryString = query.print('basic');

    expect(queryString).toContain(`FROM ${ALERT_EVENTS_DATA_STREAM}`);
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain('INLINE STATS');
    expect(queryString).toContain('first_timestamp = MIN(@timestamp)');
    expect(queryString).toContain('last_timestamp = MAX(@timestamp)');
    expect(queryString).toContain('BY episode.id');
    expect(queryString).toContain('EVAL duration = DATE_DIFF');
    expect(queryString).toContain('"ms"');
    expect(queryString).toContain('first_timestamp');
    expect(queryString).toContain('last_timestamp');
    expect(queryString).toContain('WHERE @timestamp == last_timestamp');
  });
});

describe('buildEpisodesQuery', () => {
  it('should join both data streams', () => {
    const query = buildEpisodesQuery();
    const queryString = query.print('basic');

    expect(queryString).toContain(`FROM ${ALERT_EVENTS_DATA_STREAM}`);
    expect(queryString).toContain(ALERT_ACTIONS_DATA_STREAM);
  });

  it('should compute effective_status from deactivation actions', () => {
    const query = buildEpisodesQuery();
    const queryString = query.print('basic');

    expect(queryString).toContain(
      'last_deactivate_action = LAST(action_type, @timestamp) WHERE (action_type IN ("deactivate", "activate"))'
    );
    expect(queryString).toContain('last_tags = LAST(tags, @timestamp) WHERE action_type == "tag"');
    expect(queryString).toContain('BY group_hash');
    expect(queryString).toContain('EVAL effective_status = CASE');
    expect(queryString).toContain('last_deactivate_action == "deactivate"');
  });

  it('should build query with default sort', () => {
    const query = buildEpisodesQuery();
    const queryString = query.print('basic');

    expect(queryString).toContain('SORT @timestamp DESC');
    expect(queryString).toContain(`LIMIT ?${PAGE_SIZE_ESQL_VARIABLE}`);
  });

  it('should correctly sanitize and apply custom sort', () => {
    const query = buildEpisodesQuery({
      sortField: 'episode.id',
      sortDirection: 'asc',
    });
    const queryString = query.print('basic');

    expect(queryString).toContain('episode.id');
    expect(queryString).toContain('SORT `episode.id` ASC');
  });

  it('should sanitize invalid sort fields to @timestamp', () => {
    const query = buildEpisodesQuery({
      sortField: 'invalid.field',
      sortDirection: 'desc',
    });
    const queryString = query.print('basic');

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

  it('should filter on effective_status when status filter is set', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { status: 'active' }
    );
    const queryString = query.print('basic');

    expect(queryString).toContain('WHERE effective_status == "active"');
  });

  it('should not filter on effective_status when no status filter is set', () => {
    const query = buildEpisodesQuery({ sortField: '@timestamp', sortDirection: 'desc' }, {});
    const queryString = query.print('basic');

    expect(queryString).not.toContain('WHERE effective_status ==');
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
    expect(queryString).toContain('WHERE effective_status == "active"');
    expect(queryString).toContain('WHERE rule.id == "rule-123"');
  });

  it('should apply single tag filter with MV_CONTAINS', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { tags: ['prod'] }
    );
    const queryString = query.print('basic');

    expect(queryString).toContain('MV_CONTAINS(last_tags, "prod")');
  });

  it('should apply multiple tags as OR of MV_CONTAINS', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { tags: ['a', 'b'] }
    );
    const queryString = query.print('basic');

    expect(queryString).toContain('MV_CONTAINS(last_tags, "a")');
    expect(queryString).toContain('OR');
    expect(queryString).toContain('MV_CONTAINS(last_tags, "b")');
  });

  it('should ignore empty tag strings when filtering', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { tags: ['  ', ''] }
    );
    const queryString = query.print('basic');

    expect(queryString).not.toContain('MV_CONTAINS(last_tags');
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
      { queryString: null, status: null, ruleId: undefined, tags: null }
    );
    const queryString = query.print('basic');

    expect(queryString).not.toContain('QSTR');
    expect(queryString).not.toContain('WHERE effective_status ==');
    expect(queryString).not.toContain('WHERE rule.id ==');
    expect(queryString).not.toContain('MV_CONTAINS(last_tags');
  });

  it('should not apply queryString filter when it is empty or whitespace', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { queryString: '   ' }
    );
    const queryString = query.print('basic');

    expect(queryString).not.toContain('QSTR');
  });

  it('should apply assigneeUid filter with per-episode INLINE STATS', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { assigneeUid: 'user-123' }
    );
    const queryString = query.print('basic');

    expect(queryString).toContain(
      'action_type IN ("deactivate", "activate", "snooze", "unsnooze", "tag", "ack", "unack", "assign")'
    );
    expect(queryString).toContain('EVAL episode_id = COALESCE(`episode.id`, episode_id)');
    expect(queryString).toContain(
      'last_assignee_uid = LAST(assignee_uid, @timestamp) WHERE action_type == "assign"'
    );
    expect(queryString).toContain('BY episode_id');
    expect(queryString).toContain('WHERE last_assignee_uid == "user-123"');
  });

  it('should always include assign actions and assignee INLINE STATS regardless of filter', () => {
    const query = buildEpisodesQuery({ sortField: '@timestamp', sortDirection: 'desc' }, {});
    const queryString = query.print('basic');

    expect(queryString).toContain(
      'action_type IN ("deactivate", "activate", "snooze", "unsnooze", "tag", "ack", "unack", "assign")'
    );
    expect(queryString).toContain('EVAL episode_id = COALESCE(`episode.id`, episode_id)');
    expect(queryString).toContain('last_assignee_uid');
    expect(queryString).not.toContain('WHERE last_assignee_uid');
  });

  it('should combine assigneeUid with other filters', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { assigneeUid: 'user-123', status: 'active', ruleId: 'rule-456' }
    );
    const queryString = query.print('basic');

    expect(queryString).toContain('WHERE last_assignee_uid == "user-123"');
    expect(queryString).toContain('WHERE effective_status == "active"');
    expect(queryString).toContain('WHERE rule.id == "rule-456"');
  });

  it('should apply queryString with assigneeUid filter', () => {
    const query = buildEpisodesQuery(
      { sortField: '@timestamp', sortDirection: 'desc' },
      { assigneeUid: 'user-123', queryString: 'alert.name: "test"' }
    );
    const queryString = query.print('basic');

    expect(queryString).toContain('QSTR("alert.name: \\"test\\"")');
    expect(queryString).toContain('WHERE last_assignee_uid == "user-123"');
  });
});

describe('buildEpisodesBaseQuery — action state stats', () => {
  it('computes last_snooze_action and snooze_expiry grouped by group_hash', () => {
    const esql = buildEpisodesBaseQuery().print('basic');
    expect(esql).toMatch(
      /last_snooze_action\s*=\s*LAST\(action_type,\s*@timestamp\)\s*WHERE\s*\(action_type\s*IN\s*\("snooze",\s*"unsnooze"\)\)/
    );
    expect(esql).toMatch(
      /snooze_expiry\s*=\s*LAST\(expiry,\s*@timestamp\)\s*WHERE\s*action_type\s*==\s*"snooze"/
    );
  });
  it('unifies episode.id and episode_id before computing per-episode action stats', () => {
    const esql = buildEpisodesBaseQuery().print('basic');
    expect(esql).toMatch(/EVAL\s+episode_id\s*=\s*COALESCE\(`episode\.id`,\s*episode_id\)/);
    expect(esql).toMatch(
      /last_ack_action\s*=\s*LAST\(action_type,\s*@timestamp\)\s*WHERE\s*\(action_type\s*IN\s*\("ack",\s*"unack"\)\)/
    );
    expect(esql).toMatch(
      /last_assignee_uid\s*=\s*LAST\(assignee_uid,\s*@timestamp\)\s*WHERE\s*action_type\s*==\s*"assign"/
    );
    expect(esql).toMatch(/BY\s*episode_id/);
  });
});
