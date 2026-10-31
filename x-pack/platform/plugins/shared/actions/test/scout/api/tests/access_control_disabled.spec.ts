/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient, KibanaRole } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const CONNECTOR_INDEX = '.kibana_alerting_cases';
// Kibana's own system user in the local Scout cluster, the only user that may read and write
// connector documents directly.
const KIBANA_SYSTEM_HEADERS = {
  authorization: `Basic ${Buffer.from('kibana_system:changeme').toString('base64')}`,
};
const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31',
};
// Another user with connector privileges: without object-level security, only feature privileges
// decide what they can do.
const CONNECTORS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { actions: ['all'] }, spaces: ['*'] }],
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
    let ownerHeaders: Record<string, string>;
    let otherHeaders: Record<string, string>;
    const connectorIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth }) => {
      ownerHeaders = {
        ...COMMON_HEADERS,
        ...(await samlAuth.asInteractiveUser('editor')).cookieHeader,
      };
      otherHeaders = {
        ...COMMON_HEADERS,
        ...(await samlAuth.asInteractiveUser(CONNECTORS_ROLE)).cookieHeader,
      };
    });

    apiTest.afterAll(async ({ apiClient }) => {
      for (const id of connectorIds) {
        await apiClient.delete(`api/actions/connector/${id}`, { headers: ownerHeaders });
      }
    });

    const createConnector = async (apiClient: ApiClientFixture) => {
      const response = await apiClient.post('api/actions/connector', {
        headers: ownerHeaders,
        responseType: 'json',
        body: { name: 'disabled ols', connector_type_id: '.server-log', config: {}, secrets: {} },
      });
      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      connectorIds.push(response.body.id);
      return response.body.id as string;
    };

    const getRawAcl = async (esClient: EsClient, id: string) => {
      const { _source: source } = await esClient.get<Record<string, unknown>>(
        { index: CONNECTOR_INDEX, id: `action:${id}` },
        { headers: KIBANA_SYSTEM_HEADERS }
      );
      return source?.acl;
    };

    apiTest('reports the disabled state, and rejects access changes', async ({ apiClient }) => {
      const policy = await apiClient.get('internal/security/access_control/action/_policy', {
        headers: ownerHeaders,
        responseType: 'json',
      });
      expect(policy).toHaveStatusCode(200);
      expect(policy.body.enabled).toBe(false);

      const accessPath = `internal/security/access_control/action/${await createConnector(
        apiClient
      )}`;
      expect(await apiClient.get(accessPath, { headers: ownerHeaders })).toHaveStatusCode(400);
      expect(
        await apiClient.put(accessPath, {
          headers: ownerHeaders,
          body: { version: 'WzEsMV0=', general_access: 'none', entries: [] },
        })
      ).toHaveStatusCode(400);
    });

    apiTest(
      'creates connectors without an ACL, and rejects requested access',
      async ({ apiClient, esClient }) => {
        const id = await createConnector(apiClient);
        expect(await getRawAcl(esClient, id)).toBeUndefined();

        const restricted = await apiClient.post('api/actions/connector', {
          headers: ownerHeaders,
          body: {
            name: 'restricted while disabled',
            connector_type_id: '.server-log',
            config: {},
            secrets: {},
            access_control: { general_access: 'none' },
          },
        });
        expect(restricted).toHaveStatusCode(400);
      }
    );

    apiTest(
      'ignores a stored ACL for authorization, and keeps it on updates',
      async ({ apiClient, esClient }) => {
        const id = await createConnector(apiClient);
        // The stored form that Kibana writes: it has no `entries` when there are none.
        const storedAcl = {
          version: 1,
          owner: { type: 'user', id: 'u_owner' },
          general_access: 'none',
        };
        await esClient.update(
          { index: CONNECTOR_INDEX, id: `action:${id}`, doc: { acl: storedAcl }, refresh: true },
          { headers: KIBANA_SYSTEM_HEADERS }
        );

        // Feature privileges decide alone, as before platform object-level security.
        const connectorPath = `api/actions/connector/${id}`;
        expect(await apiClient.get(connectorPath, { headers: otherHeaders })).toHaveStatusCode(200);
        expect(
          await apiClient.post(`${connectorPath}/_execute`, {
            headers: otherHeaders,
            body: { params: { message: 'disabled' } },
          })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.put(connectorPath, {
            headers: otherHeaders,
            body: { name: 'edited while disabled', config: {}, secrets: {} },
          })
        ).toHaveStatusCode(200);

        // The ACL survives the content update, so re-enabling applies it again.
        expect(await getRawAcl(esClient, id)).toStrictEqual(storedAcl);
      }
    );
  }
);
