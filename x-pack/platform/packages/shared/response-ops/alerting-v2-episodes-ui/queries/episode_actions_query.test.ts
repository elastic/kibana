/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodeActionsQuery } from './episode_actions_query';

describe('buildEpisodeActionsQuery', () => {
  it('filters by episode ids and aggregates last ack action and assignee per episode', () => {
    const queryString = buildEpisodeActionsQuery(['ep-a', 'ep-b']).print('basic');
    expect(queryString).toContain('episode_id IN');
    expect(queryString).toContain('"ep-a"');
    expect(queryString).toContain('"ep-b"');
    expect(queryString).toContain('action_type IN ("ack", "unack", "assign")');
    expect(queryString).toContain('ack_action = CASE(action_type IN ("ack", "unack")');
    expect(queryString).toContain('last_ack_action = LAST(ack_action');
    expect(queryString).toContain('last_assignee_uid = LAST(assignee_value');
    expect(queryString).toContain('BY episode_id, rule_id, group_hash');
  });
});
