/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ElasticsearchRoleDescriptor, KibanaRole } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from '../../../scout/api/fixtures/constants';

const UNIT_ID = 'default';
const SOURCE_ID = 'scout-v2-privileges';
const DESTINATION_ID = 'scout-v2-privileges-destination';
const SPACE_ID = 'streams-v2-privileges';

const UNIT_PATH = `internal/streams/unit/${UNIT_ID}`;
const SOURCE_API_KEYS_PATH = `internal/streams/sources/api_keys?sourceId=${SOURCE_ID}`;
const SOURCE_API_KEY_PATH = 'internal/streams/sources/api_key';
const DESTINATION_API_KEY_PATH = 'internal/streams/destinations/api_key';
const DESTINATION_API_KEY_PRIVILEGES_PATH = `${DESTINATION_API_KEY_PATH}/privileges`;
const LEGACY_STATUS_PATH = 'api/streams/_status';

type CookieHeader = Record<string, string>;

/**
 * Every role can read the `logs` data streams that the legacy status route inspects, so a
 * 403 comes from the Kibana feature privilege and not from Elasticsearch.
 */
const kibanaRole = (feature: Record<string, string[]>, spaces = ['*']): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logs*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [{ base: [], feature, spaces }],
});

const V2_READ_ROLE = kibanaRole({ streamsV2: ['read'] });
const V2_ALL_ROLE = kibanaRole({ streamsV2: ['all'] });
const LEGACY_ALL_ROLE = kibanaRole({ streams: ['all'] });
const V2_ALL_IN_ONE_SPACE_ROLE = kibanaRole({ streamsV2: ['all'] }, [SPACE_ID]);

const V2_ALL_APPLICATION_PRIVILEGE = {
  application: 'kibana-.kibana',
  privileges: ['feature_streamsV2.all'],
  resources: ['*'],
};

/** The privilege Managed Inputs checks on `source:<id>` with the shipper's key. */
const SOURCE_WRITE_APPLICATION_PRIVILEGE = {
  application: 'streams',
  privileges: ['write'],
  resources: ['source:*'],
};

/** Write patterns of an Auto destination that sends every signal. */
const AUTO_DESTINATION_PATTERNS = ['logs-*-*', 'metrics-*-*', 'traces-*-*'];

/**
 * The non-admin V2 manager setup documented in DEVELOPMENT.md: a Kibana role with Streams V2
 * `all` plus the `streams_v2_manager` Elasticsearch role. Scout gives each test user exactly one
 * role, so this merges both.
 */
const V2_MANAGER_ROLE: ElasticsearchRoleDescriptor = {
  cluster: ['manage_own_api_key'],
  indices: [
    {
      names: ['logs-*', 'metrics-*', 'traces-*'],
      privileges: [
        'read',
        'view_index_metadata',
        'monitor',
        'read_failure_store',
        'create_doc',
        'auto_configure',
      ],
    },
  ],
  applications: [V2_ALL_APPLICATION_PRIVILEGE, SOURCE_WRITE_APPLICATION_PRIVILEGE],
};

const V2_ALL_WITH_MANAGE_OWN_API_KEY_ROLE: ElasticsearchRoleDescriptor = {
  cluster: ['manage_own_api_key'],
  applications: [V2_ALL_APPLICATION_PRIVILEGE],
};

const request = (
  apiClient: ApiClientFixture,
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  cookieHeader: CookieHeader,
  body?: Record<string, unknown>
) =>
  apiClient[method](path, {
    headers: {
      ...(path.startsWith('api/') ? PUBLIC_API_HEADERS : COMMON_API_HEADERS),
      ...cookieHeader,
    },
    responseType: 'json',
    ...(body ? { body } : {}),
  });

const mintSourceApiKey = async (apiClient: ApiClientFixture, cookieHeader: CookieHeader) => {
  const response = await request(apiClient, 'post', SOURCE_API_KEY_PATH, cookieHeader, {
    sourceId: SOURCE_ID,
    sourceTypeSlug: 'otlp',
  });
  expect(response).toHaveStatusCode(200);
  return response.body as { id: string; encodedApiKey: string };
};

const createSourceApiKey = async (apiClient: ApiClientFixture, cookieHeader: CookieHeader) =>
  (await mintSourceApiKey(apiClient, cookieHeader)).id;

const listSourceApiKeyIds = async (apiClient: ApiClientFixture, cookieHeader: CookieHeader) => {
  const response = await request(apiClient, 'get', SOURCE_API_KEYS_PATH, cookieHeader);
  expect(response).toHaveStatusCode(200);
  return (response.body.apiKeys as Array<{ id: string }>).map(({ id }) => id);
};

apiTest.describe('Streams V2 privileges', { tag: tags.serverless.observability.complete }, () => {
  apiTest.beforeAll(async ({ kbnClient }) => {
    await kbnClient.spaces.create({ id: SPACE_ID, name: SPACE_ID });
    await kbnClient.uiSettings.update({ [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: true });
    await kbnClient.uiSettings.update(
      { [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: true },
      { space: SPACE_ID }
    );
  });

  apiTest.afterEach(async ({ apiClient, samlAuth }) => {
    // Cleanup only: the dev-only reset revokes every recorded key and removes the unit document.
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    await request(apiClient, 'post', `${UNIT_PATH}/_reset`, cookieHeader);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset(OBSERVABILITY_STREAMS_ENABLE_CANVAS);
    await kbnClient.spaces.delete(SPACE_ID);
  });

  apiTest(
    'V2 read can read the unit but not manage it or use legacy routes',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(V2_READ_ROLE);

      // No unit is stored, so an authorized read answers 404 rather than 403.
      expect(await request(apiClient, 'get', UNIT_PATH, cookieHeader)).toHaveStatusCode(404);
      expect(
        await request(apiClient, 'put', UNIT_PATH, cookieHeader, {
          unit: { sources: [], destinations: [], pipelines: [] },
        })
      ).toHaveStatusCode(403);
      expect(await request(apiClient, 'get', SOURCE_API_KEYS_PATH, cookieHeader)).toHaveStatusCode(
        403
      );
      expect(await request(apiClient, 'get', LEGACY_STATUS_PATH, cookieHeader)).toHaveStatusCode(
        403
      );
    }
  );

  apiTest(
    'V2 read grants the data stream stats routes the destination indices table uses',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(V2_READ_ROLE);
      // Never created, so every route takes its no-data path and only Kibana authorization is tested.
      const streams = ['logs-v2privileges-default'];
      const timeRange = { start: Date.now() - 15 * 60 * 1000, end: Date.now() };

      for (const [path, body] of [
        ['internal/streams/doc_counts/total', { streams }],
        ['internal/streams/doc_counts/degraded', { streams }],
        ['internal/streams/doc_counts/failed', { streams, ...timeRange }],
        ['internal/streams/doc_counts/ingestion', { streams, ...timeRange }],
        ['internal/streams/storage_stats', { streams }],
      ] as const) {
        expect(await request(apiClient, 'post', path, cookieHeader, body)).toHaveStatusCode(200);
      }
    }
  );

  apiTest(
    'legacy Streams all grants the legacy routes but no V2 route',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(LEGACY_ALL_ROLE);

      expect(await request(apiClient, 'get', LEGACY_STATUS_PATH, cookieHeader)).toHaveStatusCode(
        200
      );
      expect(await request(apiClient, 'get', UNIT_PATH, cookieHeader)).toHaveStatusCode(403);
      expect(await request(apiClient, 'get', SOURCE_API_KEYS_PATH, cookieHeader)).toHaveStatusCode(
        403
      );
    }
  );

  apiTest(
    'V2 all without manage_own_api_key cannot mint a source key',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(V2_ALL_ROLE);

      const privileges = await request(
        apiClient,
        'get',
        `internal/streams/sources/api_key/privileges?sourceId=${SOURCE_ID}&sourceTypeSlug=otlp`,
        cookieHeader
      );
      expect(privileges).toHaveStatusCode(200);
      expect(privileges.body).toStrictEqual({ canCreate: false, failure: 'cluster' });

      expect(
        await request(apiClient, 'post', SOURCE_API_KEY_PATH, cookieHeader, {
          sourceId: SOURCE_ID,
          sourceTypeSlug: 'otlp',
        })
      ).toHaveStatusCode(403);
      expect(await listSourceApiKeyIds(apiClient, cookieHeader)).toStrictEqual([]);
    }
  );

  apiTest(
    'V2 all with manage_own_api_key but no streams application privilege cannot mint a source key',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(
        V2_ALL_WITH_MANAGE_OWN_API_KEY_ROLE
      );

      const privileges = await request(
        apiClient,
        'get',
        `internal/streams/sources/api_key/privileges?sourceId=${SOURCE_ID}&sourceTypeSlug=otlp`,
        cookieHeader
      );
      expect(privileges).toHaveStatusCode(200);
      expect(privileges.body).toStrictEqual({ canCreate: false, failure: 'source' });

      expect(
        await request(apiClient, 'post', SOURCE_API_KEY_PATH, cookieHeader, {
          sourceId: SOURCE_ID,
          sourceTypeSlug: 'otlp',
        })
      ).toHaveStatusCode(403);
      expect(await listSourceApiKeyIds(apiClient, cookieHeader)).toStrictEqual([]);
    }
  );

  apiTest(
    'V2 manager mints, lists and revokes a source-scoped key',
    async ({ apiClient, samlAuth, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(V2_MANAGER_ROLE);

      const { id: keyId, encodedApiKey } = await mintSourceApiKey(apiClient, cookieHeader);
      expect(await listSourceApiKeyIds(apiClient, cookieHeader)).toStrictEqual([keyId]);

      const keyPrivileges = await esClient.security.hasPrivileges(
        {
          application: [
            {
              application: SOURCE_WRITE_APPLICATION_PRIVILEGE.application,
              privileges: SOURCE_WRITE_APPLICATION_PRIVILEGE.privileges,
              resources: [`source:${SOURCE_ID}`, 'source:another-source'],
            },
          ],
          index: [{ names: ['logs*'], privileges: ['create_doc'] }],
        },
        { headers: { authorization: `ApiKey ${encodedApiKey}` } }
      );
      expect(keyPrivileges.application.streams).toStrictEqual({
        [`source:${SOURCE_ID}`]: { write: true },
        'source:another-source': { write: false },
      });
      expect(keyPrivileges.index).toStrictEqual({ 'logs*': { create_doc: false } });

      const revoke = await request(apiClient, 'delete', SOURCE_API_KEY_PATH, cookieHeader, {
        sourceId: SOURCE_ID,
        apiKeyId: keyId,
      });
      expect(revoke).toHaveStatusCode(200);
      expect(revoke.body).toStrictEqual({ invalidatedApiKeys: [keyId] });

      const { api_keys: apiKeys } = await esClient.security.getApiKey({ id: keyId });
      expect(apiKeys[0].invalidated).toBe(true);
      expect(await listSourceApiKeyIds(apiClient, cookieHeader)).toStrictEqual([]);
    }
  );

  apiTest(
    'V2 all with manage_own_api_key but no index privileges cannot mint a destination key',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(
        V2_ALL_WITH_MANAGE_OWN_API_KEY_ROLE
      );

      const privileges = await request(
        apiClient,
        'post',
        DESTINATION_API_KEY_PRIVILEGES_PATH,
        cookieHeader,
        { patterns: AUTO_DESTINATION_PATTERNS }
      );
      expect(privileges).toHaveStatusCode(200);
      expect(privileges.body).toStrictEqual({
        canCreate: false,
        failure: 'index',
        missingPatterns: AUTO_DESTINATION_PATTERNS,
      });

      expect(
        await request(apiClient, 'post', DESTINATION_API_KEY_PATH, cookieHeader, {
          destinationId: DESTINATION_ID,
          patterns: AUTO_DESTINATION_PATTERNS,
        })
      ).toHaveStatusCode(403);
    }
  );

  apiTest(
    'V2 manager mints and revokes a destination key scoped to its write patterns',
    async ({ apiClient, samlAuth, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(V2_MANAGER_ROLE);

      const privileges = await request(
        apiClient,
        'post',
        DESTINATION_API_KEY_PRIVILEGES_PATH,
        cookieHeader,
        { patterns: AUTO_DESTINATION_PATTERNS }
      );
      expect(privileges).toHaveStatusCode(200);
      expect(privileges.body).toStrictEqual({
        canCreate: true,
        failure: 'none',
        missingPatterns: [],
      });

      const mint = await request(apiClient, 'post', DESTINATION_API_KEY_PATH, cookieHeader, {
        destinationId: DESTINATION_ID,
        patterns: AUTO_DESTINATION_PATTERNS,
      });
      expect(mint).toHaveStatusCode(200);
      const { id: keyId, encodedApiKey } = mint.body as { id: string; encodedApiKey: string };

      const keyPrivileges = await esClient.security.hasPrivileges(
        {
          index: [
            { names: ['logs-app-default', 'other-index'], privileges: ['create_doc', 'read'] },
          ],
        },
        { headers: { authorization: `ApiKey ${encodedApiKey}` } }
      );
      expect(keyPrivileges.index).toStrictEqual({
        'logs-app-default': { create_doc: true, read: false },
        'other-index': { create_doc: false, read: false },
      });

      const revoke = await request(apiClient, 'delete', DESTINATION_API_KEY_PATH, cookieHeader, {
        destinationId: DESTINATION_ID,
        apiKeyId: keyId,
      });
      expect(revoke).toHaveStatusCode(200);
      expect(revoke.body).toStrictEqual({ invalidatedApiKeys: [keyId] });

      const { api_keys: apiKeys } = await esClient.security.getApiKey({ id: keyId });
      expect(apiKeys[0].invalidated).toBe(true);
    }
  );

  apiTest(
    'V2 all revokes a key another user minted without any API key privilege',
    async ({ apiClient, samlAuth, esClient }) => {
      const { cookieHeader: adminCookie } = await samlAuth.asInteractiveUser('admin');
      const keyId = await createSourceApiKey(apiClient, adminCookie);

      const { cookieHeader } = await samlAuth.asInteractiveUser(V2_ALL_ROLE);
      expect(await listSourceApiKeyIds(apiClient, cookieHeader)).toStrictEqual([keyId]);

      const revoke = await request(apiClient, 'delete', SOURCE_API_KEY_PATH, cookieHeader, {
        sourceId: SOURCE_ID,
        apiKeyId: keyId,
      });
      expect(revoke).toHaveStatusCode(200);

      const { api_keys: apiKeys } = await esClient.security.getApiKey({ id: keyId });
      expect(apiKeys[0].invalidated).toBe(true);
    }
  );

  apiTest(
    'api_keys in a PUT body is rejected and the registry is unchanged',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader: adminCookie } = await samlAuth.asInteractiveUser('admin');
      const keyId = await createSourceApiKey(apiClient, adminCookie);

      const { cookieHeader } = await samlAuth.asInteractiveUser(V2_ALL_ROLE);
      const put = await request(apiClient, 'put', UNIT_PATH, cookieHeader, {
        unit: { sources: [], destinations: [], pipelines: [] },
        api_keys: [],
      });
      expect(put).toHaveStatusCode(400);
      expect(await listSourceApiKeyIds(apiClient, cookieHeader)).toStrictEqual([keyId]);
    }
  );

  apiTest(
    'V2 all in one space grants V2 routes in that space only',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(V2_ALL_IN_ONE_SPACE_ROLE);

      expect(
        await request(apiClient, 'get', `s/${SPACE_ID}/${SOURCE_API_KEYS_PATH}`, cookieHeader)
      ).toHaveStatusCode(200);
      expect(await request(apiClient, 'get', SOURCE_API_KEYS_PATH, cookieHeader)).toHaveStatusCode(
        403
      );
    }
  );
});
