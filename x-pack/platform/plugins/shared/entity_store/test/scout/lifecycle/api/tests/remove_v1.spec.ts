/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { PUBLIC_HEADERS, ENTITY_STORE_TAGS } from '../../../common/fixtures/constants';
import { installAllEntityTypes, uninstallAllEntityTypes } from '../../../common/fixtures/helpers';
import { createSystemIndicesEsClient } from '../fixtures/system_indices_es_client';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../../common';

const KIBANA_INDEX = '.kibana';

// The `.kibana` index is a system index; direct access additionally requires
// the x-elastic-product-origin header alongside allow_restricted_indices.
const SYSTEM_INDEX_HEADERS = { 'x-elastic-product-origin': 'kibana' };

// entity-definition was a `multiple-isolated` SO type, so the raw .kibana
// document id is `entity-definition:<objectId>` with no namespace prefix
// (see generateRawId in the core SO serializer).
const v1EntityDefinitionDocId = (entityType: string, namespace: string) =>
  `entity-definition:security_${entityType}_${namespace}`;

// entity-engine-status is still a registered SO type (retained for v1 detection),
// accessible through the public SO API on all targets including Cloud serverless.
const V1_ENGINE_STATUS_TYPE = 'entity-engine-status';
// Mirrors the id built in server/infra/remove_v1.ts:112.
const v1EngineDescriptorId = (entityType: string, namespace: string) =>
  `entity-engine-descriptor-${entityType}-${namespace}`;

const ALL_ENTITY_TYPES = ['user', 'host', 'service', 'generic'] as const;

apiTest.describe('Entity Store remove_v1 SO cleanup', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  // system_indices_superuser is a file-realm account that @kbn/es bind-mounts
  // into locally-managed clusters only (see kbn-es/src/serverless_resources/users).
  // It does not exist on Cloud serverless (MKI), so this client is only created
  // on non-MKI targets. Tests that need it guard themselves with
  // config.isCloud && config.serverless.
  let systemIndicesEsClient: Client | undefined;

  apiTest.beforeAll(async ({ samlAuth, kbnClient, esClient, config }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });

    if (!(config.isCloud && config.serverless)) {
      systemIndicesEsClient = await createSystemIndicesEsClient(esClient, config);
    }
  });

  apiTest.afterEach(async ({ apiClient }) => {
    // Remove any seeded .kibana docs first and unconditionally so neither a failed
    // install nor a failed uninstall can leak legacy documents into sibling suites
    // sharing this cluster. Only attempted when the privileged client was created
    // (i.e. not on Cloud serverless / MKI).
    if (systemIndicesEsClient !== undefined) {
      await Promise.all(
        ALL_ENTITY_TYPES.map((type) =>
          systemIndicesEsClient!.delete(
            { index: KIBANA_INDEX, id: v1EntityDefinitionDocId(type, 'default'), refresh: true },
            { headers: SYSTEM_INDEX_HEADERS, ignore: [404] }
          )
        )
      );
    }
    // Remove any seeded entity-engine-status descriptors (accessible on all targets).
    await Promise.all(
      ALL_ENTITY_TYPES.map((type) =>
        apiClient.delete(
          `api/saved_objects/${V1_ENGINE_STATUS_TYPE}/${v1EngineDescriptorId(type, 'default')}`,
          { headers: defaultHeaders }
        )
      )
    );
    await uninstallAllEntityTypes(apiClient, defaultHeaders);
  });

  apiTest(
    'install removes legacy entity-definition SO documents from .kibana',
    async ({ apiClient, config }) => {
      // system_indices_superuser does not exist on Cloud serverless (MKI) — only
      // @kbn/es-managed clusters have this file-realm account (see serverless_resources/users).
      apiTest.skip(
        config.isCloud && config.serverless,
        'system_indices_superuser does not exist on Cloud serverless (MKI)'
      );

      const soDocIds = ALL_ENTITY_TYPES.map((type) => v1EntityDefinitionDocId(type, 'default'));

      // Seed fake legacy entity-definition docs directly into .kibana. These
      // would have been written by the now-deleted entity_manager plugin;
      // we simulate their presence to verify that stopAndRemoveV1 deletes them.
      await Promise.all(
        soDocIds.map((id) =>
          systemIndicesEsClient!.index(
            {
              index: KIBANA_INDEX,
              id,
              document: {
                type: 'entity-definition',
                references: [],
                updated_at: new Date().toISOString(),
              },
              refresh: 'wait_for',
            },
            { headers: SYSTEM_INDEX_HEADERS }
          )
        )
      );

      const beforeExists = await Promise.all(
        soDocIds.map((id) =>
          systemIndicesEsClient!.exists(
            { index: KIBANA_INDEX, id },
            { headers: SYSTEM_INDEX_HEADERS }
          )
        )
      );
      expect(beforeExists).toStrictEqual([true, true, true, true]);

      // install triggers AssetManagerClient.init → stopAndRemoveV1 for each
      // entity type, which deletes the entity-definition doc from .kibana via
      // internalEsClient.delete (kibana_system identity).
      const install = await installAllEntityTypes(apiClient, defaultHeaders);
      expect(install.statusCode).toBe(201);

      const afterExists = await Promise.all(
        soDocIds.map((id) =>
          systemIndicesEsClient!.exists(
            { index: KIBANA_INDEX, id },
            { headers: SYSTEM_INDEX_HEADERS }
          )
        )
      );
      expect(afterExists).toStrictEqual([false, false, false, false]);
    }
  );

  apiTest(
    'install succeeds with no legacy entity-definition SOs present',
    async ({ apiClient, config }) => {
      // system_indices_superuser does not exist on Cloud serverless (MKI) — only
      // @kbn/es-managed clusters have this file-realm account (see serverless_resources/users).
      apiTest.skip(
        config.isCloud && config.serverless,
        'system_indices_superuser does not exist on Cloud serverless (MKI)'
      );

      const soDocIds = ALL_ENTITY_TYPES.map((type) => v1EntityDefinitionDocId(type, 'default'));

      // Confirm nothing pre-exists — install must not fail when there is
      // nothing to clean up (the delete uses ignore: [404]).
      const beforeExists = await Promise.all(
        soDocIds.map((id) =>
          systemIndicesEsClient!.exists(
            { index: KIBANA_INDEX, id },
            { headers: SYSTEM_INDEX_HEADERS }
          )
        )
      );
      expect(beforeExists).toStrictEqual([false, false, false, false]);

      const install = await installAllEntityTypes(apiClient, defaultHeaders);
      expect(install.statusCode).toBe(201);
    }
  );

  apiTest('install removes legacy entity-engine-status SO descriptors', async ({ apiClient }) => {
    // entity-engine-status is still a registered SO type (retained so the
    // auto-install hook can detect whether a space previously had v1 enabled).
    // Seeding and asserting via the public SO API works on all four targets
    // including Cloud serverless (MKI) — no system-index access needed.

    // Seed fake legacy v1 engine-status descriptors via the public SO API.
    await Promise.all(
      ALL_ENTITY_TYPES.map((type) =>
        apiClient.post(
          `api/saved_objects/${V1_ENGINE_STATUS_TYPE}/${v1EngineDescriptorId(type, 'default')}`,
          {
            headers: defaultHeaders,
            responseType: 'json',
            body: { attributes: { type, status: 'running' } },
          }
        )
      )
    );

    const beforeStatus = await Promise.all(
      ALL_ENTITY_TYPES.map((type) =>
        apiClient.get(
          `api/saved_objects/${V1_ENGINE_STATUS_TYPE}/${v1EngineDescriptorId(type, 'default')}`,
          { headers: defaultHeaders, responseType: 'json' }
        )
      )
    );
    expect(beforeStatus.map((r) => r.statusCode)).toStrictEqual([200, 200, 200, 200]);

    // install triggers AssetManagerClient.init → stopAndRemoveV1 for each entity type,
    // which calls savedObjectsClient.delete('entity-engine-status', ...) (remove_v1.ts:164).
    const install = await installAllEntityTypes(apiClient, defaultHeaders);
    expect(install.statusCode).toBe(201);

    const afterStatus = await Promise.all(
      ALL_ENTITY_TYPES.map((type) =>
        apiClient.get(
          `api/saved_objects/${V1_ENGINE_STATUS_TYPE}/${v1EngineDescriptorId(type, 'default')}`,
          { headers: defaultHeaders, responseType: 'json' }
        )
      )
    );
    expect(afterStatus.map((r) => r.statusCode)).toStrictEqual([404, 404, 404, 404]);
  });
});
