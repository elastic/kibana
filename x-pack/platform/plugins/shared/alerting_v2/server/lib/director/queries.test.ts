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

    // Single round-trip across both datastreams — the director consults
    // `.alert-actions` for the user-lock signal alongside the rule-events
    // aggregate.
    expect(printed).toContain('FROM .rule-events, .alert-actions');
    expect(printed).toContain('WHERE');
    // `.rule-events` uses nested `rule.id`; `.alert-actions` uses flat `rule_id`.
    // The query accepts either so lifecycle rows from the audit stream are
    // still selected. Both placeholders bind to the same rule id value —
    // the composer auto-assigns unique param names per interpolation.
    expect(printed).toMatch(/rule\.id == \?\w+ OR rule_id == \?\w+/);
    expect(printed).toContain('group_hash IN ("hash-a", "hash-b")');
    expect(printed).toContain('STATS');

    // Rule-events aggregations are scoped by `type == "alert" AND
    // episode.status IS NOT NULL`. Rows from `.alert-actions` have a null
    // `type` and null `episode.status`, so both filters exclude them
    // automatically. Whitespace-agnostic matches keep us robust to
    // wrapping in the composer's pretty-printer.
    const alertScope = 'WHERE\\s+type == "alert" AND episode\\.status IS NOT NULL';
    expect(printed).toMatch(new RegExp(`last_status = LAST\\(status, @timestamp\\) ${alertScope}`));
    expect(printed).toMatch(
      new RegExp(`last_episode_id = LAST\\(episode\\.id, @timestamp\\) ${alertScope}`)
    );
    expect(printed).toMatch(
      new RegExp(`last_episode_status = LAST\\(episode\\.status, @timestamp\\) ${alertScope}`)
    );
    expect(printed).toMatch(
      new RegExp(
        `last_episode_status_count = LAST\\(episode\\.status_count, @timestamp\\) ${alertScope}`
      )
    );
    expect(printed).toMatch(
      new RegExp(`last_episode_timestamp = MAX\\(@timestamp\\) ${alertScope}`)
    );
    // The alert-actions aggregation is scoped to lifecycle actions only —
    // ack/snooze/tag/assign audit rows must not influence the user lock.
    expect(printed).toMatch(
      /last_lifecycle_action_type = LAST\(action_type, @timestamp\) WHERE\s+action_type IN\s*\(\s*"activate", "deactivate"\s*\)/
    );
    expect(printed).toContain('BY group_hash');
    expect(printed).toContain('KEEP');
  });

  it('binds both `rule.id` and `rule_id` occurrences to the same ruleId value and inlines groupHashes', () => {
    const query = getLatestAlertEventStateQuery({
      ruleId: 'rule-abc',
      groupHashes: ['hash-1', 'hash-2', 'hash-3'],
    });

    // Every param produced by the query must resolve to `rule-abc`. This
    // catches the class of bug where the two occurrences of the rule id
    // (`.rule-events` uses nested `rule.id`, `.alert-actions` uses flat
    // `rule_id`) diverge silently.
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
    // Every param produced for this query resolves to the rule id.
    // Belt-and-braces guard against silent divergence between the two
    // rule-id occurrences.
    for (const entry of params) {
      for (const value of Object.values(entry)) {
        expect(value).toBe('rule-42');
      }
    }
    expect(request.query).toContain('group_hash IN ("h1", "h2")');
  });
});
