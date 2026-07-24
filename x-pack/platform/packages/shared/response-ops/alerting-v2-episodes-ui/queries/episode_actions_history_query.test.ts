/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEpisodeActionsHistoryQuery,
  DEFAULT_ACTIONS_HISTORY_PAGE_SIZE,
} from './episode_actions_history_query';

describe('buildEpisodeActionsHistoryQuery', () => {
  it('filters by episode id and group hash, covers all action types, sorts newest-first, and defaults the page size', () => {
    const queryString = buildEpisodeActionsHistoryQuery('default', 'ep-1', 'hash-1').print('basic');
    expect(queryString).toContain('"ep-1"');
    expect(queryString).toContain('"hash-1"');
    expect(queryString).toContain(
      'action_type IN ("ack", "unack", "snooze", "unsnooze", "deactivate", "activate", "tag", "assign")'
    );
    expect(queryString).toContain('@timestamp');
    expect(queryString).toContain('DESC');
    expect(queryString).toContain(`LIMIT ${DEFAULT_ACTIONS_HISTORY_PAGE_SIZE}`);
    expect(queryString).toContain('METADATA _id');
    expect(queryString).not.toContain('@timestamp <=');
  });

  it('uses a different space id when provided', () => {
    const queryString = buildEpisodeActionsHistoryQuery('my-space', 'ep-1', 'hash-1').print(
      'basic'
    );
    expect(queryString).toContain('"my-space"');
  });

  it('adds a keyset cursor filter when a "before" timestamp is provided', () => {
    const queryString = buildEpisodeActionsHistoryQuery('default', 'ep-1', 'hash-1', {
      before: '2024-01-01T00:00:00.000Z',
    }).print('basic');
    expect(queryString).toContain('@timestamp <= "2024-01-01T00:00:00.000Z"');
  });

  it('uses a custom page size when provided', () => {
    const queryString = buildEpisodeActionsHistoryQuery('default', 'ep-1', 'hash-1', {
      limit: 50,
    }).print('basic');
    expect(queryString).toContain('LIMIT 50');
  });
});
