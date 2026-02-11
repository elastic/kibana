/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLastNotifiedTimestampsQuery } from './queries';

describe('getLastNotifiedTimestampsQuery', () => {
  it('builds a query for a single notification group', () => {
    const req = getLastNotifiedTimestampsQuery(['group-1']);

    expect(req.query).toContain('notification_group_id IN ("group-1")');
    expect(req.query).toContain('.alerts-actions');
    expect(req.query).toContain('last_notified = MAX(@timestamp)');
  });

  it('builds a query for multiple notification groups', () => {
    const req = getLastNotifiedTimestampsQuery(['group-1', 'group-2']);

    expect(req.query).toContain('notification_group_id IN ("group-1", "group-2")');
  });
});
