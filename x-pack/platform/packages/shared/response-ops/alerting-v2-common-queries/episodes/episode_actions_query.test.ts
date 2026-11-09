/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodeActionsQuery } from './episode_actions_query';

describe('buildEpisodeActionsQuery', () => {
  it('filters by episode ids and aggregates the latest per-episode actions', () => {
    const queryString = buildEpisodeActionsQuery('default', ['ep-a', 'ep-b']).print('basic');
    expect(queryString).toContain('alert_id IN');
    expect(queryString).not.toContain('episode_id');
    expect(queryString).toContain('"ep-a"');
    expect(queryString).toContain('"ep-b"');
    expect(queryString).toContain(
      'action_type IN ("ack", "unack", "assign", "deactivate", "activate", "tag")'
    );
    expect(queryString).toContain('BY alert_id, rule_id, group_hash');
  });

  it('filters each aggregation by its action types so later actions of other types do not null it', () => {
    const queryString = buildEpisodeActionsQuery('default', ['ep-a']).print('basic');
    expect(queryString).not.toContain('CASE(');
    expect(queryString).toContain(
      'last_ack_action = LAST(action_type, @timestamp) WHERE (action_type IN ("ack", "unack"))'
    );
    expect(queryString).toContain(
      'last_assignee_uid = LAST(assignee_uid, @timestamp) WHERE action_type == "assign"'
    );
    expect(queryString).toContain(
      'last_ack_actor = LAST(actor.profile_uid, @timestamp) WHERE action_type == "ack"'
    );
    expect(queryString).toContain(
      'last_deactivate_action = LAST(action_type, @timestamp) WHERE (action_type IN ("deactivate", "activate"))'
    );
    expect(queryString).toContain(
      'last_deactivate_actor = LAST(actor.profile_uid, @timestamp) WHERE action_type == "deactivate"'
    );
    expect(queryString).toContain('last_tags = LAST(tags, @timestamp) WHERE action_type == "tag"');
    expect(queryString).toMatch(/KEEP [^|]*\blast_tags\b/);
  });
});
