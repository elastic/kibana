/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy } from '@kbn/ftr-llm-proxy';
import type { SmlAttachHttpResponse, SmlSearchHttpResponse } from '../../../../common/http_api/sml';
import {
  smlElasticsearchIndexMappings,
  smlIndexName,
} from '../../../../server/services/sml/sml_storage';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS, INTERNAL_AGENT_BUILDER } from '../fixtures/constants';
import { postConverse } from '../fixtures/converse_http';

apiTest.describe(
  'Agent Builder — SML internal API (stateful)',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, esClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      const exists = await esClient.indices.exists({ index: smlIndexName });
      if (!exists) {
        await esClient.indices.create({
          index: smlIndexName,
          mappings: smlElasticsearchIndexMappings,
        });
      }
    });

    const ih = () => ({
      ...COMMON_HEADERS,
      ...adminCredentials.apiKeyHeader,
      'x-elastic-internal-origin': 'kibana',
    });

    apiTest(
      'POST /internal/agent_builder/sml/_search autocomplete',
      async ({ esClient, apiClient }) => {
        const runId = randomUUID();
        const chunkId = `sml-ftr-autocomplete-${runId}`;
        const originId = `sml-ftr-origin-${runId}`;
        const indexedTitle = `sml ftr autocomplete pacific bluefin ${runId}`;
        const now = '2024-06-01T12:00:00.000Z';
        await esClient.index({
          index: smlIndexName,
          id: chunkId,
          refresh: 'wait_for',
          document: {
            id: chunkId,
            type: 'visualization',
            title: indexedTitle,
            origin_id: originId,
            content: 'pacific bluefin tuna content for sml ftr',
            created_at: now,
            updated_at: now,
            spaces: ['default'],
            permissions: [],
          },
        });

        const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/sml/_search`, {
          headers: ih(),
          body: { query: 'pacif', size: 20 },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const body = response.body as SmlSearchHttpResponse;
        expect(body.total).toBeGreaterThan(0);
        const match = body.results.find((r) => r.id === chunkId);
        expect(match).toBeDefined();
        expect(match?.title).toContain('pacific');
        expect(match?.origin_id).toBe(originId);
        expect(match?.type).toBe('visualization');

        await esClient.delete({ index: smlIndexName, id: chunkId, refresh: true });
      }
    );

    apiTest(
      'POST /internal/agent_builder/sml/_search wildcard returns expected item fields',
      async ({ apiClient }) => {
        const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/sml/_search`, {
          headers: ih(),
          body: { query: '*', size: 10 },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const body = response.body as SmlSearchHttpResponse;
        expect(typeof body.total).toBe('number');
        expect(Array.isArray(body.results)).toBe(true);
        for (const item of body.results) {
          expect(typeof item.id).toBe('string');
          expect(typeof item.origin_id).toBe('string');
          expect(typeof item.type).toBe('string');
          expect(typeof item.title).toBe('string');
          expect(typeof item.content).toBe('string');
          expect(typeof item.score).toBe('number');
        }
      }
    );

    apiTest(
      'POST /internal/agent_builder/sml/_search omits content when skip_content is true',
      async ({ apiClient }) => {
        const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/sml/_search`, {
          headers: ih(),
          body: { query: '*', size: 10, skip_content: true },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const body = response.body as SmlSearchHttpResponse;
        expect(body.results.length).toBeGreaterThan(0);
        for (const item of body.results) {
          expect('content' in item).toBe(false);
        }
      }
    );

    apiTest(
      'POST /internal/agent_builder/sml/_search rejects empty query',
      async ({ apiClient }) => {
        const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/sml/_search`, {
          headers: ih(),
          body: { query: '' },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'POST /internal/agent_builder/sml/_attach returns 404 when conversation missing',
      async ({ apiClient }) => {
        const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/sml/_attach`, {
          headers: ih(),
          body: {
            conversation_id: 'non-existent-conversation-id-for-sml-attach-ftr',
            chunk_ids: ['irrelevant-chunk-id-for-sml-attach-ftr'],
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(404);
        expect(
          typeof response.body === 'object' &&
            response.body !== null &&
            'message' in (response.body as object)
        ).toBe(true);
      }
    );

    apiTest(
      'POST /internal/agent_builder/sml/_attach attaches chunk and persists attachment refs',
      async ({ apiClient, esClient, log, kbnClient }) => {
        const runId = randomUUID();
        const chunkId = `sml-ftr-attach-${runId}`;
        const indexedTitle = `sml ftr attach ${runId}`;
        const llmProxy = await createLlmProxy(log);
        const { id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy);

        const now = '2024-06-01T12:00:00.000Z';
        await esClient.index({
          index: smlIndexName,
          id: chunkId,
          refresh: 'wait_for',
          document: {
            id: chunkId,
            type: 'connector',
            title: indexedTitle,
            origin_id: connectorId,
            content: `attach content for ${runId}`,
            created_at: now,
            updated_at: now,
            spaces: ['default'],
            permissions: [],
          },
        });

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: `SML attach title ${runId}`,
          response: 'SML attach response',
        });
        const converseRes = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          {
            input: 'Create round for SML attach',
            attachments: [{ type: 'text', data: { content: `existing text attachment ${runId}` } }],
            connector_id: connectorId,
          },
          'local'
        );
        expect(converseRes).toHaveStatusCode(200);
        const conversationId = (converseRes.body as { conversation_id: string }).conversation_id;
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const attachResponse = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/sml/_attach`, {
          headers: ih(),
          body: { conversation_id: conversationId, chunk_ids: [chunkId] },
          responseType: 'json',
        });
        expect(attachResponse).toHaveStatusCode(200);
        const attachBody = attachResponse.body as SmlAttachHttpResponse;
        expect(attachBody.results).toHaveLength(1);
        expect(attachBody.results[0].success).toBe(true);

        const conversation = await apiClient.get(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
          { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
        );
        expect(conversation).toHaveStatusCode(200);
        const conv = conversation.body as {
          attachments?: Array<{ type: string; id: string }>;
          rounds: Array<{ input: { attachment_refs?: Array<{ attachment_id: string }> } }>;
        };
        const attachments = conv.attachments ?? [];
        expect(attachments[0].type).toBe('text');
        expect(attachments[1].type).toBe('connector');
        const lastRound = conv.rounds[conv.rounds.length - 1];
        expect(lastRound.input.attachment_refs?.[0].attachment_id).toBe(attachments[0].id);
        expect(lastRound.input.attachment_refs?.[1].attachment_id).toBe(attachments[1].id);

        await apiClient.delete(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
          { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader } }
        );
        llmProxy.close();
        await deleteConnectorById(kbnClient, connectorId);
        await esClient.delete({ index: smlIndexName, id: chunkId, refresh: true });
      }
    );
  }
);
