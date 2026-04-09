/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildGroupActionsQuery } from './group_actions_query';

describe('buildGroupActionsQuery', () => {
  it('filters by group hashes and aggregates tags and snooze fields', () => {
    const queryString = buildGroupActionsQuery(['gh-1', 'gh-2']).print('basic');
    expect(queryString).toContain('group_hash IN');
    expect(queryString).toContain('"gh-1"');
    expect(queryString).toContain('"gh-2"');
    expect(queryString).toContain('last_snooze_action');
    expect(queryString).toContain('snooze_expiry');
    expect(queryString).toContain('BY group_hash, rule_id');
  });
});
