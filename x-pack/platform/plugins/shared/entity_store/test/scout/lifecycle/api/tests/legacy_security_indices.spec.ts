/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
  LATEST_INDEX,
} from '../../../common/fixtures/constants';
import { clearEntityStoreIndices } from '../../../common/fixtures/helpers';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../../common';
import { getLegacySecurityLatestEntitiesIndexName } from '../../../../../common/domain/entity_index';
import { hashEuid } from '../../../../../common/domain/euid';

const GRAPH_ROUTE = 'internal/cloud_security_posture/graph';
const LEGACY_LATEST_INDEX = getLegacySecurityLatestEntitiesIndexName('default');

const ACTOR_EUID = 'host:admin-box';
const TARGET_EUID = 'host:web-01';
const GRAPH_SOURCE_EUID = 'host:graph-a';
const GRAPH_DEST_EUID = 'host:graph-b';

const entityDoc = (euid: string, name: string, extra: Record<string, unknown> = {}) => ({
  '@timestamp': new Date().toISOString(),
  entity: {
    id: euid,
    name,
    type: 'host',
    source: 'entityanalytics_ad',
    EngineMetadata: { Type: 'host' },
    lifecycle: { last_seen: new Date().toISOString() },
    ...extra,
  },
  host: { name },
});

/**
 * Regression suite for the `.entities.v2.*.security_{space}` -> neutral rename
 * (#282130 / #285777 / #286313). While the `entityStore.migrateLegacySecurityAssets`
 * feature flag is off (the default here), upgraded deployments keep the legacy
 * Security-scoped concrete index, and every reader must resolve it via the
 * `entities-latest-{space}` alias or the legacy-aware resolver instead of
 * assuming the neutral name.
 *
 * Setup converts a fresh install to the legacy on-disk state: the latest index
 * is recreated under the legacy name (lookup mode preserved), the alias is
 * retargeted, and the neutral index is deleted. Unit tests cannot catch this
 * class of bug — mocked ES clients make every index name "exist".
 */
apiTest.describe(
  'Entity Store readers on legacy Security-scoped indices',
  { tag: ENTITY_STORE_TAGS },
  () => {
    let publicHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;
    let graphHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, kbnClient, apiClient, esClient }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      publicHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
      internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };
      graphHeaders = { ...internalHeaders, 'elastic-api-version': '1' };

      await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });

      const getStatus = async () => {
        const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
          headers: publicHeaders,
          responseType: 'json',
        });
        return (status.body as { status: string }).status;
      };

      // Preceding specs uninstall the store, and uninstall cleanup deletes
      // indices under BOTH naming schemes asynchronously — wait for a stable
      // state before creating the legacy fixture or that cleanup deletes it.
      await expect
        .poll(getStatus, { timeout: 60_000, intervals: [2_000] })
        .toMatch(/^(not_installed|running|stopped)$/);

      const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: publicHeaders,
        responseType: 'json',
        body: {},
      });
      expect(install.statusCode).toBe(201);

      // Install returns before per-engine initialization finishes; converting
      // the index mid-install races the init steps that ensure neutral assets.
      await expect.poll(getStatus, { timeout: 120_000, intervals: [2_000] }).toBe('running');

      // Convert the fresh (neutral) install into the pre-rename on-disk state:
      // same mappings and lookup mode, but under the legacy Security-scoped name.
      const neutral = await esClient.indices.get({ index: LATEST_INDEX });
      const neutralMappings = neutral[LATEST_INDEX]?.mappings ?? {};
      await esClient.indices.create({
        index: LEGACY_LATEST_INDEX,
        settings: { index: { mode: 'lookup', hidden: true } },
        mappings: neutralMappings,
      });
      await esClient.indices.delete({ index: LATEST_INDEX });
      await esClient.indices.updateAliases({
        actions: [{ add: { index: LEGACY_LATEST_INDEX, alias: LATEST_ALIAS } }],
      });

      // Maintainer fixture: an AD-sourced actor whose raw_identifiers name the
      // target host, plus the target itself (validateTargetIds requires it).
      // Graph fixture: a pair connected via a pre-written relationship.
      const docs = [
        entityDoc(ACTOR_EUID, 'admin-box', {
          relationships: { administers: { raw_identifiers: { 'host.name': ['web-01'] } } },
        }),
        entityDoc(TARGET_EUID, 'web-01'),
        entityDoc(GRAPH_SOURCE_EUID, 'graph-a', {
          relationships: { depends_on: { ids: [GRAPH_DEST_EUID] } },
        }),
        entityDoc(GRAPH_DEST_EUID, 'graph-b'),
      ];
      for (const doc of docs) {
        // Match the store's document identity: _id is the hashed EUID, which is
        // how the CRUD client addresses entities when maintainers write back.
        await esClient.index({
          index: LEGACY_LATEST_INDEX,
          id: hashEuid(doc.entity.id as string),
          refresh: 'wait_for',
          document: doc,
        });
      }

      // Fixture sanity: all seeded docs must be reachable through the alias.
      // A failure here means setup raced concurrent cleanup, not a reader bug.
      const seeded = await esClient.count({ index: LATEST_ALIAS });
      expect(seeded.count).toBe(docs.length);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: publicHeaders,
        responseType: 'json',
        body: {},
      });
      await esClient.indices.delete(
        { index: LEGACY_LATEST_INDEX, ignore_unavailable: true },
        { ignore: [404] }
      );
      await clearEntityStoreIndices(esClient);
    });

    apiTest(
      'relationship maintainer discovers actors and validates targets on the legacy index',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(120_000);
        // sync=true runs the maintainer inline; the async variant (runSoon) races
        // with the scheduled run that install kicks off and can 500 on overlap.
        const run = await apiClient.post(
          `${ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_RUN('administers')}?sync=true`,
          { headers: internalHeaders, responseType: 'json', body: {} }
        );
        expect(run.statusCode).toBe(200);

        // Before the alias fix, actor discovery searched the neutral wildcard
        // (matching nothing) and the run finished as a silent no-op.
        await expect
          .poll(
            async () => {
              await esClient.indices.refresh({ index: LATEST_ALIAS });
              const result = await esClient.search<{
                entity?: { relationships?: { administers?: { ids?: string[] } } };
              }>({
                index: LATEST_ALIAS,
                query: { term: { 'entity.id': ACTOR_EUID } },
              });
              return result.hits.hits[0]?._source?.entity?.relationships?.administers?.ids ?? [];
            },
            { timeout: 90_000, intervals: [2_000] }
          )
          .toContain(TARGET_EUID);
      }
    );

    apiTest(
      'graph API resolves the legacy index and returns entity nodes and relationship edges',
      async ({ apiClient }) => {
        const response = await apiClient.post(GRAPH_ROUTE, {
          headers: graphHeaders,
          responseType: 'json',
          body: {
            query: {
              originEventIds: [],
              entityIds: [{ id: GRAPH_SOURCE_EUID, isOrigin: true }],
              start: 'now-1d',
              end: 'now',
            },
          },
        });
        expect(response.statusCode).toBe(200);

        // Before the resolver fix, the graph existence check probed only the
        // neutral name and every entity-store-backed fetch returned empty.
        const { nodes, edges } = response.body as {
          nodes: Array<{ id: string }>;
          edges: Array<{ id: string }>;
        };
        const nodeIds = nodes.map((node) => node.id);
        expect(nodeIds).toContain(GRAPH_SOURCE_EUID);
        expect(nodes.length).toBeGreaterThanOrEqual(2);
        expect(edges.length).toBeGreaterThanOrEqual(1);
      }
    );
  }
);
