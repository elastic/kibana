/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  createOlsTestContext,
  type OlsTestContext,
} from '../../../scout_ols_poc/api/fixtures/personas';

const CONNECTOR_INDEX = '.kibana_alerting_cases';
// Kibana's own system user in the local Scout cluster, the only user that may read and write
// connector documents directly.
const KIBANA_SYSTEM_HEADERS = {
  authorization: `Basic ${Buffer.from('kibana_system:changeme').toString('base64')}`,
};

/**
 * With `xpack.security.accessControl.enabled: false` (the default), connectors behave as they did
 * before platform object-level security, even when they store an ACL, and the ACL is kept so that
 * re-enabling applies it again.
 */
apiTest.describe(
  'Connectors with object-level security disabled',
  { tag: '@local-stateful-classic' },
  () => {
    let ctx: OlsTestContext;

    apiTest.beforeAll(async ({ apiClient, esClient, kbnClient }) => {
      ctx = await createOlsTestContext({ apiClient, esClient, kbnClient });
    });

    apiTest.afterAll(async () => {
      await ctx.cleanup();
    });

    const getRawAcl = async (esClient: EsClient, id: string) => {
      const { _source: source } = await esClient.get<Record<string, unknown>>(
        { index: CONNECTOR_INDEX, id: `action:${id}` },
        { headers: KIBANA_SYSTEM_HEADERS }
      );
      return source?.acl;
    };

    apiTest('reports the disabled state, and rejects access changes', async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      const policy = await api.request(
        'owner',
        'get',
        'internal/security/access_control/action/_policy'
      );
      expect(policy).toHaveStatusCode(200);
      expect(policy.body.enabled).toBe(false);

      const id = await api.createConnector('owner');
      expect(
        await api.request('owner', 'get', `internal/security/access_control/action/${id}`)
      ).toHaveStatusCode(400);
      expect(
        await api.request('owner', 'put', `internal/security/access_control/action/${id}`, {
          version: 'WzEsMV0=',
          general_access: 'none',
          entries: [],
        })
      ).toHaveStatusCode(400);
    });

    apiTest(
      'creates connectors without an ACL, and rejects requested access',
      async ({ apiClient, esClient }) => {
        const api = ctx.api(apiClient);
        const id = await api.createConnector('owner');
        expect(await getRawAcl(esClient, id)).toBeUndefined();

        const restricted = await api.request('owner', 'post', 'api/actions/connector', {
          name: 'restricted while disabled',
          connector_type_id: '.server-log',
          config: {},
          secrets: {},
          access_control: { general_access: 'none' },
        });
        expect(restricted).toHaveStatusCode(400);
      }
    );

    apiTest(
      'ignores a stored ACL for authorization, and keeps it on updates',
      async ({ apiClient, esClient }) => {
        const api = ctx.api(apiClient);
        const id = await api.createConnector('owner');
        // The stored form that Kibana writes: it has no `entries` when there are none.
        const storedAcl = { version: 1, owner: ctx.principal('owner'), general_access: 'none' };
        await esClient.update(
          { index: CONNECTOR_INDEX, id: `action:${id}`, doc: { acl: storedAcl }, refresh: true },
          { headers: KIBANA_SYSTEM_HEADERS }
        );

        // Feature privileges decide alone, as before platform object-level security.
        expect(
          await api.request('stranger', 'get', `api/actions/connector/${id}`)
        ).toHaveStatusCode(200);
        expect(
          await api.request('stranger', 'post', `api/actions/connector/${id}/_execute`, {
            params: { message: 'disabled' },
          })
        ).toHaveStatusCode(200);
        expect(
          await api.request('stranger', 'put', `api/actions/connector/${id}`, {
            name: 'edited while disabled',
            config: {},
            secrets: {},
          })
        ).toHaveStatusCode(200);

        // The ACL survives the content update, so re-enabling applies it again.
        expect(await getRawAcl(esClient, id)).toStrictEqual(storedAcl);
      }
    );
  }
);
