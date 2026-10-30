/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  createOlsTestContext,
  type OlsApi,
  type OlsTestContext,
  type Persona,
} from '../fixtures/personas';

/**
 * A rule runs its actions with its own API key, so every path that creates or keeps that key
 * checks that the key can use the rule's restricted connectors.
 */
apiTest.describe(
  'Rule API keys and restricted connectors',
  { tag: '@local-stateful-classic' },
  () => {
    let ctx: OlsTestContext;
    let privateId: string;

    apiTest.beforeAll(async ({ apiClient, esClient, kbnClient }) => {
      ctx = await createOlsTestContext({ apiClient, esClient, kbnClient });
      privateId = await ctx.api(apiClient).createConnector('owner', {
        general_access: 'none',
        entries: [{ ...ctx.principal('grantee'), access: 'use' }],
      });
    });

    apiTest.afterAll(async () => {
      await ctx.cleanup();
    });

    const createRule = (api: OlsApi, persona: Persona, connectorId: string) =>
      api.request(persona, 'post', 'api/alerting/rule', {
        name: `ols-rule-${randomUUID().slice(0, 8)}`,
        rule_type_id: '.index-threshold',
        consumer: 'stackAlerts',
        enabled: false,
        schedule: { interval: '1h' },
        params: {
          index: ['ols-rule-keys'],
          timeField: '@timestamp',
          aggType: 'count',
          groupBy: 'all',
          threshold: [1],
          thresholdComparator: '>',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
        },
        actions: [
          {
            id: connectorId,
            group: 'threshold met',
            params: { level: 'info', message: 'Threshold met' },
            frequency: { summary: false, notify_when: 'onActionGroupChange', throttle: null },
          },
        ],
      });

    apiTest(
      'lets only people who can use a restricted connector add it to a rule',
      async ({ apiClient }) => {
        const api = ctx.api(apiClient);

        const created = await createRule(api, 'grantee', privateId);
        expect(created, JSON.stringify(created.body)).toHaveStatusCode(200);

        const refused = await createRule(api, 'stranger', privateId);
        expect(refused.statusCode).not.toBe(200);
      }
    );

    apiTest(
      'refuses a new rule key that can no longer use the connector',
      async ({ apiClient }) => {
        const api = ctx.api(apiClient);
        const created = await createRule(api, 'grantee', privateId);
        expect(created, JSON.stringify(created.body)).toHaveStatusCode(200);

        // The owner revokes the grant. Enabling mints a new key for the grantee, which cannot use the
        // connector anymore.
        await api.setAccess(privateId, { general_access: 'none' });
        const enabled = await api.request(
          'grantee',
          'post',
          `api/alerting/rule/${created.body.id}/_enable`
        );
        expect(enabled, JSON.stringify(enabled.body)).toHaveStatusCode(403);
        expect(enabled.body.message).toBe(`The rule's API key cannot use connector "${privateId}"`);

        // The owner can still enable it: the owner's key can use the connector.
        expect(
          await api.request('owner', 'post', `api/alerting/rule/${created.body.id}/_enable`)
        ).toHaveStatusCode(204);
      }
    );
  }
);
