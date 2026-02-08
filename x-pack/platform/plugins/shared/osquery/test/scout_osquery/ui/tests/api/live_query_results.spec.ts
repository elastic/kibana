/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';
import { socManagerRole } from '../../../common/roles';
import { loadLiveQuery } from '../../../common/api_helpers';

test.describe('Live query', { tag: ['@ess', '@svlSecurity'] }, () => {
  let liveQueryId: string;
  let queriesQueryActionId: string;

  test.beforeEach(async ({ kbnClient, browserAuth }) => {
    await browserAuth.loginWithCustomRole(socManagerRole);
    const liveQuery = await loadLiveQuery(kbnClient);
    liveQueryId = liveQuery.action_id;
    queriesQueryActionId = liveQuery.queries?.[0]?.action_id;
  });

  test('GET getLiveQueryDetailsRoute - validates we get successful response', async ({
    kbnClient,
  }) => {
    const { status } = await kbnClient.request({
      method: 'GET',
      path: `/api/osquery/live_queries/${liveQueryId}`,
    });
    expect(status).toBe(200);
  });

  test('GET getLiveQueryResultsRoute - validates we get successful response', async ({
    kbnClient,
  }) => {
    const { status } = await kbnClient.request({
      method: 'GET',
      path: `/api/osquery/live_queries/${liveQueryId}/results/${queriesQueryActionId}`,
    });
    expect(status).toBe(200);
  });
});
