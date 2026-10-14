/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodeActionsHistoryQuery } from './episode_actions_history_query';

describe('buildEpisodeActionsHistoryQuery', () => {
  it('filters by episode id and group hash, covers all action types, and sorts newest-first', () => {
    const queryString = buildEpisodeActionsHistoryQuery('default', 'ep-1', 'hash-1', {
      limit: 25,
    }).print('basic');
    expect(queryString).toContain('"ep-1"');
    expect(queryString).toContain('"hash-1"');
    expect(queryString).toContain(
      'action_type IN ("ack", "unack", "snooze", "unsnooze", "deactivate", "activate", "tag", "assign")'
    );
    expect(queryString).toContain('@timestamp');
    expect(queryString).toContain('DESC');
    expect(queryString).toContain('LIMIT 25');
    expect(queryString).toContain('METADATA _id');
    expect(queryString).not.toContain('@timestamp <=');
  });

  it('matches the episode actions on alert_id and the series actions on a null alert_id', () => {
    const queryString = buildEpisodeActionsHistoryQuery('default', 'ep-1', 'hash-1', {
      limit: 25,
    }).print('basic');
    expect(queryString).toContain('alert_id == "ep-1"');
    expect(queryString).toContain('group_hash == "hash-1"');
    expect(queryString).toContain('alert_id IS NULL');
    expect(queryString).toMatch(/KEEP .*\balert_id\b/);
    expect(queryString).not.toContain('episode_id');
  });

  it('projects the actor leaf fields instead of the actor object', () => {
    const queryString = buildEpisodeActionsHistoryQuery('default', 'ep-1', 'hash-1', {
      limit: 25,
    }).print('basic');
    expect(queryString).toContain('`actor.type`');
    expect(queryString).toContain('`actor.profile_uid`');
    expect(queryString).not.toMatch(/[^.]actor,/);
  });

  it('uses a different space id when provided', () => {
    const queryString = buildEpisodeActionsHistoryQuery('my-space', 'ep-1', 'hash-1', {
      limit: 25,
    }).print('basic');
    expect(queryString).toContain('"my-space"');
  });

  it('adds a keyset cursor filter when a "before" timestamp is provided', () => {
    const queryString = buildEpisodeActionsHistoryQuery('default', 'ep-1', 'hash-1', {
      before: '2024-01-01T00:00:00.000Z',
      limit: 25,
    }).print('basic');
    expect(queryString).toContain('@timestamp <= "2024-01-01T00:00:00.000Z"');
  });

  it('uses the provided page size', () => {
    const queryString = buildEpisodeActionsHistoryQuery('default', 'ep-1', 'hash-1', {
      limit: 50,
    }).print('basic');
    expect(queryString).toContain('LIMIT 50');
  });
});
