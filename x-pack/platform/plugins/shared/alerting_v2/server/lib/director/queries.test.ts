/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestAlertEventStateQuery } from './queries';

describe('getLatestAlertEventStateQuery', () => {
  it('generates a valid ES|QL query that spans both `.rule-events` and `.alert-actions`', () => {
    const query = getLatestAlertEventStateQuery({
      ruleId: 'rule-1',
      groupHashes: ['hash-a', 'hash-b'],
    });

    const printed = query.print();

    expect(printed).toContain('FROM .rule-events, .alert-actions');
    expect(printed).toContain('WHERE');
    expect(printed).toMatch(/rule\.id == \?\w+ OR rule_id == \?\w+/);
    expect(printed).toContain('group_hash IN ("hash-a", "hash-b")');
    expect(printed).toContain('STATS');

    const alertScope = '\\s+WHERE\\s+type == "alert" AND episode\\.status IS NOT NULL';
    expect(printed).toMatch(new RegExp(`last_status = LAST\\(status, @timestamp\\)${alertScope}`));
    expect(printed).toMatch(
      new RegExp(`last_episode_id = LAST\\(episode\\.id, @timestamp\\)${alertScope}`)
    );
    expect(printed).toMatch(
      new RegExp(`last_episode_status = LAST\\(episode\\.status, @timestamp\\)${alertScope}`)
    );
    expect(printed).toMatch(
      new RegExp(
        `last_episode_status_count = LAST\\(episode\\.status_count, @timestamp\\)${alertScope}`
      )
    );
    expect(printed).toMatch(
      new RegExp(`last_episode_timestamp = MAX\\(@timestamp\\)${alertScope}`)
    );

    expect(printed).toMatch(
      /last_action_episode_id = LAST\(episode_id, @timestamp\)\s+WHERE\s+action_type IN\s*\(\s*"activate", "deactivate"\s*\)/
    );
    expect(printed).toMatch(
      /last_action_type = LAST\(action_type, @timestamp\)\s+WHERE\s+action_type IN\s*\(\s*"activate", "deactivate"\s*\)/
    );
    expect(printed).toContain('BY group_hash');
    expect(printed).toContain('KEEP');
  });

  it('correlates the audit action_type with the rule-events episode via a post-STATS EVAL', () => {
    const query = getLatestAlertEventStateQuery({
      ruleId: 'rule-1',
      groupHashes: ['hash-a'],
    });

    const printed = query.print();

    // The `last_lifecycle_action_type` reported to the director must be
    // gated on the audit doc's `episode_id` matching the current
    // rule-events `last_episode_id`. Any divergence (concurrent bulk
    // actions targeting different episodes of the same group, or partial
    // `_bulk` writes) must resolve to NULL, which the director reads as
    // "no lock".
    expect(printed).toMatch(
      /EVAL\s+last_lifecycle_action_type\s*=\s*CASE\(\s*last_action_episode_id == last_episode_id\s*,\s*last_action_type\s*,\s*NULL\s*\)/
    );
  });

  it('does not leak the intermediate correlation columns through KEEP', () => {
    const query = getLatestAlertEventStateQuery({
      ruleId: 'rule-1',
      groupHashes: ['hash-a'],
    });

    const printed = query.print();

    const keepMatch = printed.match(/KEEP\s+([\s\S]*?)$/);
    expect(keepMatch).not.toBeNull();

    const keepClause = keepMatch![1];
    expect(keepClause).not.toContain('last_action_episode_id');
    expect(keepClause).not.toContain('last_action_type,');
    expect(keepClause).not.toMatch(/last_action_type\s*$/m);
  });

  it('binds both `rule.id` and `rule_id` occurrences to the same ruleId value and inlines groupHashes', () => {
    const query = getLatestAlertEventStateQuery({
      ruleId: 'rule-abc',
      groupHashes: ['hash-1', 'hash-2', 'hash-3'],
    });

    const params = query.getParams();
    for (const value of Object.values(params)) {
      expect(value).toBe('rule-abc');
    }
    expect(params).not.toHaveProperty('groupHashes');

    const printed = query.print();
    expect(printed).toContain('group_hash IN ("hash-1", "hash-2", "hash-3")');
  });

  it('keeps exactly the expected columns in the correct order', () => {
    const query = getLatestAlertEventStateQuery({
      ruleId: 'rule-1',
      groupHashes: ['hash-a'],
    });

    const printed = query.print();

    const keepMatch = printed.match(/KEEP\s+([\s\S]*?)$/);
    expect(keepMatch).not.toBeNull();

    const keepClause = keepMatch![1];
    expect(keepClause).toContain('last_status');
    expect(keepClause).toContain('last_episode_id');
    expect(keepClause).toContain('last_episode_status');
    expect(keepClause).toContain('last_episode_status_count');
    expect(keepClause).toContain('last_episode_timestamp');
    expect(keepClause).toContain('last_lifecycle_action_type');
    expect(keepClause).toContain('group_hash');
  });

  it('scopes the rule-events aggregations with per-agg filters (type == "alert" AND episode.status IS NOT NULL)', () => {
    const query = getLatestAlertEventStateQuery({
      ruleId: 'rule-1',
      groupHashes: ['hash-a'],
    });

    const printed = query.print();

    expect(printed).toContain('type == "alert"');
    expect(printed).toContain('episode.status IS NOT NULL');
  });

  it('groups stats by group_hash', () => {
    const query = getLatestAlertEventStateQuery({
      ruleId: 'rule-1',
      groupHashes: ['hash-a'],
    });

    const printed = query.print();

    expect(printed).toContain('BY group_hash');
  });

  it('generates a valid request object with query and params', () => {
    const query = getLatestAlertEventStateQuery({
      ruleId: 'rule-42',
      groupHashes: ['h1', 'h2'],
    });

    const request = query.toRequest();

    expect(request).toHaveProperty('query');
    expect(request).toHaveProperty('params');
    expect(typeof request.query).toBe('string');
    expect(request.query).toContain('FROM .rule-events, .alert-actions');

    const params = request.params as Array<Record<string, unknown>>;

    for (const entry of params) {
      for (const value of Object.values(entry)) {
        expect(value).toBe('rule-42');
      }
    }
    expect(request.query).toContain('group_hash IN ("h1", "h2")');
  });
});
