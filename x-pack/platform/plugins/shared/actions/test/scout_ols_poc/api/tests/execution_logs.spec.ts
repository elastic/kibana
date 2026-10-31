/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  createOlsTestContext,
  type OlsApi,
  type OlsTestContext,
  type Persona,
} from '../fixtures/personas';

// Executions in this suite happen within the last hour.
// The event log is written asynchronously after each execution.
const EVENT_LOG_TIMEOUT = 30_000;
const getDateStart = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();
const getLogQuery = () => ({
  date_start: getDateStart(),
  per_page: 100,
  sort: [{ timestamp: { order: 'desc' } }],
});

apiTest.describe('Connector execution logs and KPIs', { tag: '@local-stateful-classic' }, () => {
  let ctx: OlsTestContext;
  let publicId: string;
  let privateId: string;

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient }) => {
    ctx = await createOlsTestContext({ apiClient, esClient, kbnClient });
    const api = ctx.api(apiClient);
    publicId = await api.createConnector('owner');
    privateId = await api.createConnector('owner', {
      general_access: 'none',
      entries: [{ ...ctx.principal('grantee'), access: 'use' }],
    });

    for (const id of [publicId, privateId]) {
      const response = await api.request('owner', 'post', `api/actions/connector/${id}/_execute`, {
        params: { message: 'execution log' },
      });
      expect(response).toHaveStatusCode(200);
    }
  });

  apiTest.afterAll(async () => {
    await ctx.cleanup();
  });

  /** Returns the connector IDs in a persona's execution log, waiting for both executions. */
  const getLoggedConnectorIds = async (api: OlsApi, persona: Persona) => {
    await expect
      .poll(
        async () => {
          const { body } = await api.request(
            'owner',
            'post',
            'internal/actions/_global_connector_execution_logs',
            getLogQuery()
          );
          return body.total;
        },
        { timeout: EVENT_LOG_TIMEOUT }
      )
      .toBe(2);

    const response = await api.request(
      persona,
      'post',
      'internal/actions/_global_connector_execution_logs',
      getLogQuery()
    );
    expect(response).toHaveStatusCode(200);
    return {
      total: response.body.total as number,
      ids: (response.body.data as Array<{ connector_id: string }>).map(
        ({ connector_id: id }) => id
      ),
    };
  };

  apiTest('shows executions only of connectors the caller can view', async ({ apiClient }) => {
    const api = ctx.api(apiClient);

    for (const persona of ['owner', 'grantee'] as const) {
      const { total, ids } = await getLoggedConnectorIds(api, persona);
      expect(total).toBe(2);
      expect(ids).toContain(privateId);
    }

    const stranger = await getLoggedConnectorIds(api, 'stranger');
    expect(stranger.total).toBe(1);
    expect(stranger.ids).toStrictEqual([publicId]);
  });

  apiTest('counts only executions of connectors the caller can view', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    await getLoggedConnectorIds(api, 'owner');

    const getSuccessCount = async (persona: Persona) => {
      const response = await api.request(
        persona,
        'post',
        'internal/actions/_global_connector_execution_kpi',
        { date_start: getDateStart() }
      );
      expect(response).toHaveStatusCode(200);
      return response.body.success as number;
    };

    expect(await getSuccessCount('owner')).toBe(2);
    expect(await getSuccessCount('stranger')).toBe(1);
  });
});
