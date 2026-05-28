/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { systemIndicesSuperuser } from '@kbn/test';
import { createEsClientForTesting } from '@kbn/test-es-server';
import { v4 as uuidv4 } from 'uuid';
import {
  smlElasticsearchIndexMappings,
  smlIndexName,
} from '@kbn/agent-context-layer-plugin/server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import {
  KI_ORIGIN_KIND_FEATURE,
  KI_ORIGIN_KIND_QUERY,
  KI_SML_TYPE,
  encodeKiOriginId,
} from '@kbn/streams-schema';
import { streamsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';
import { featureStorageSettings } from '../../../../../server/lib/streams/feature/storage_settings';
import { queryStorageSettings } from '../../../../../server/lib/streams/assets/storage_settings';
import {
  FEATURE_CONFIDENCE,
  FEATURE_DESCRIPTION,
  FEATURE_ID,
  FEATURE_LAST_SEEN,
  FEATURE_PROPERTIES,
  FEATURE_STATUS,
  FEATURE_TITLE,
  FEATURE_TYPE,
  FEATURE_UUID,
  STREAM_NAME as FEATURE_STREAM_NAME,
} from '../../../../../server/lib/streams/feature/fields';
import {
  ASSET_ID,
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_DESCRIPTION,
  QUERY_ESQL_QUERY,
  QUERY_TITLE,
  RULE_BACKED,
  RULE_ID,
  STREAM_NAME as QUERY_STREAM_NAME,
} from '../../../../../server/lib/streams/assets/fields';
import { getQueryLinkUuid } from '../../../../../server/lib/streams/assets/query/query_client';

const INTERNAL_AGENT_CONTEXT_LAYER = '/internal/agent_context_layer';

/**
 * Smoke test for the knowledge_indicator SML integration. Seeds a feature KI
 * and a query KI into their backing indices, mirrors them into the SML index
 * (bypassing the 10-minute crawler tick), and asserts that the search route
 * surfaces both with `type=knowledge_indicator`.
 *
 * The `_attach` round-trip is intentionally not exercised here: it requires
 * the LLM-proxy + connector + conversation setup that the agent_builder Scout
 * config carries (see `x-pack/platform/plugins/shared/agent_builder/test/scout_agent_builder/api/tests/sml_api.spec.ts`),
 * and the resolution logic is fully covered by unit tests at
 * `x-pack/platform/plugins/shared/streams/server/agent_builder/sml/knowledge_indicator_sml_type.test.ts`
 * and
 * `x-pack/platform/plugins/shared/streams/server/agent_builder/attachments/knowledge_indicator_attachment_type.test.ts`.
 *
 * Skipped until the streams Scout config grows the inference + agent_builder
 * fixtures required to make the search assertion stable in CI.
 */
apiTest.describe.skip(
  'knowledge_indicator SML integration',
  { tag: [...tags.stateful.classic] },
  () => {
    const rootStream = 'logs.otel';
    const streamName = `${rootStream}.ki_sml_${uuidv4().slice(0, 8)}`;

    const featureUuid = `feature-${uuidv4()}`;
    const featureTitle = `bluefin tuna feature ${uuidv4()}`;

    const queryAssetId = `q-${uuidv4()}`;
    const queryAssetUuid = getQueryLinkUuid(streamName, {
      [ASSET_TYPE]: 'query',
      [ASSET_ID]: queryAssetId,
    });
    const queryTitle = `bluefin tuna query ${uuidv4()}`;

    const featureChunkId = `ki-feature-chunk-${uuidv4()}`;
    const queryChunkId = `ki-query-chunk-${uuidv4()}`;

    let sysEsClient: Client;

    apiTest.beforeAll(async ({ apiServices, esClient, kbnClient, config }) => {
      await apiServices.streamsTest.enable();
      await apiServices.streamsTest.enableSignificantEvents();

      await kbnClient.uiSettings.update({
        [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
      });

      await apiServices.streamsTest.forkStream(rootStream, streamName, {
        field: 'service.name',
        eq: `ki-sml-${streamName}`,
      });

      if (!config.serverless) {
        await esClient.security.putRole({
          name: 'system_indices_superuser',
          refresh: 'wait_for',
          cluster: ['all'],
          indices: [{ names: ['*'], privileges: ['all'], allow_restricted_indices: true }],
          applications: [{ application: '*', privileges: ['*'], resources: ['*'] }],
          run_as: ['*'],
        });
        await esClient.security.putUser({
          username: systemIndicesSuperuser.username,
          refresh: 'wait_for',
          password: systemIndicesSuperuser.password,
          roles: ['system_indices_superuser'],
        });
      }

      sysEsClient = createEsClientForTesting({
        esUrl: config.hosts.elasticsearch,
        authOverride: systemIndicesSuperuser,
        isCloud: config.isCloud,
      });

      const indexExists = await sysEsClient.indices.exists({ index: smlIndexName });
      if (!indexExists) {
        await sysEsClient.indices.create({
          index: smlIndexName,
          mappings: smlElasticsearchIndexMappings,
        });
      }

      const now = new Date().toISOString();
      await esClient.index({
        index: featureStorageSettings.name,
        id: featureUuid,
        refresh: 'wait_for',
        document: {
          [FEATURE_UUID]: featureUuid,
          [FEATURE_ID]: 'feature-bluefin',
          [FEATURE_TITLE]: featureTitle,
          [FEATURE_TYPE]: 'service',
          [FEATURE_DESCRIPTION]: 'bluefin tuna feature description',
          [FEATURE_PROPERTIES]: {},
          [FEATURE_CONFIDENCE]: 90,
          [FEATURE_STATUS]: 'active',
          [FEATURE_LAST_SEEN]: now,
          [FEATURE_STREAM_NAME]: streamName,
        },
      });

      await esClient.index({
        index: queryStorageSettings.name,
        id: queryAssetUuid,
        refresh: 'wait_for',
        document: {
          [ASSET_UUID]: queryAssetUuid,
          [ASSET_ID]: queryAssetId,
          [ASSET_TYPE]: 'query',
          [QUERY_STREAM_NAME]: streamName,
          [QUERY_TITLE]: queryTitle,
          [QUERY_DESCRIPTION]: 'bluefin tuna query description',
          [QUERY_ESQL_QUERY]: 'FROM logs-* | WHERE service.name == "bluefin"',
          [RULE_BACKED]: true,
          [RULE_ID]: 'rule-bluefin',
        },
      });

      // Mirror what the crawler would do — index SML chunks for both KIs with
      // the correct origin_id prefix and the `knowledge_indicator` type. Going
      // through the real crawler would mean waiting up to 10 minutes per run.
      await sysEsClient.index({
        index: smlIndexName,
        id: featureChunkId,
        refresh: 'wait_for',
        document: {
          id: featureChunkId,
          type: KI_SML_TYPE,
          title: featureTitle,
          origin_id: encodeKiOriginId({ kind: KI_ORIGIN_KIND_FEATURE, id: featureUuid }),
          content: `${streamName}\nservice\n${featureTitle}\nbluefin tuna feature description`,
          created_at: now,
          updated_at: now,
          spaces: ['*'],
          permissions: ['api:read_stream'],
        },
      });
      await sysEsClient.index({
        index: smlIndexName,
        id: queryChunkId,
        refresh: 'wait_for',
        document: {
          id: queryChunkId,
          type: KI_SML_TYPE,
          title: queryTitle,
          origin_id: encodeKiOriginId({ kind: KI_ORIGIN_KIND_QUERY, id: queryAssetUuid }),
          content: `${streamName}\n${queryTitle}\nbluefin tuna query description\nFROM logs-* | WHERE service.name == "bluefin"`,
          created_at: now,
          updated_at: now,
          spaces: ['*'],
          permissions: ['api:read_stream'],
        },
      });
    });

    apiTest.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      await apiServices.streamsTest.cleanupTestStreams(streamName);
      await apiServices.streamsTest.disableSignificantEvents();
      await kbnClient.uiSettings.update({
        [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: false,
      });

      await Promise.allSettled([
        esClient.delete({ index: featureStorageSettings.name, id: featureUuid }),
        esClient.delete({ index: queryStorageSettings.name, id: queryAssetUuid }),
        sysEsClient?.delete({ index: smlIndexName, id: featureChunkId, refresh: true }),
        sysEsClient?.delete({ index: smlIndexName, id: queryChunkId, refresh: true }),
      ]);
    });

    apiTest(
      'SML search returns the feature KI under the knowledge_indicator type',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const response = await apiClient.post(`${INTERNAL_AGENT_CONTEXT_LAYER}/sml/_search`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: { query: featureTitle, size: 20 },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const match = (
          response.body.results as Array<{ id: string; type: string; origin_id: string }>
        ).find((r) => r.id === featureChunkId);
        expect(match).toBeDefined();
        expect(match?.type).toBe(KI_SML_TYPE);
        expect(match?.origin_id).toBe(
          encodeKiOriginId({ kind: KI_ORIGIN_KIND_FEATURE, id: featureUuid })
        );
      }
    );

    apiTest(
      'SML search returns the query KI under the knowledge_indicator type',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const response = await apiClient.post(`${INTERNAL_AGENT_CONTEXT_LAYER}/sml/_search`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: { query: queryTitle, size: 20 },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const match = (
          response.body.results as Array<{ id: string; type: string; origin_id: string }>
        ).find((r) => r.id === queryChunkId);
        expect(match).toBeDefined();
        expect(match?.type).toBe(KI_SML_TYPE);
        expect(match?.origin_id).toBe(
          encodeKiOriginId({ kind: KI_ORIGIN_KIND_QUERY, id: queryAssetUuid })
        );
      }
    );
  }
);
