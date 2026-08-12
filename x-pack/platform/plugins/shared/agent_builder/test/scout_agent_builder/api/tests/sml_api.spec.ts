/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client } from '@elastic/elasticsearch';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy } from '@kbn/ftr-llm-proxy';
import type { SmlSearchHttpResponse } from '@kbn/agent-builder-sml-plugin/common/http_api/sml';
import { smlElasticsearchIndexMappings, smlIndexName } from '@kbn/agent-builder-sml-plugin/server';
import type { SmlAttachHttpResponse } from '../../../../common/http_api/sml';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { createSystemIndicesEsClient } from '../../../scout_agent_builder_shared/lib/system_indices_es_client';
import { setupAgentDirectAnswer } from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest } from '../fixtures';
import {
  API_AGENT_BUILDER,
  COMMON_HEADERS,
  INTERNAL_AGENT_BUILDER,
  INTERNAL_AGENT_BUILDER_SML,
} from '../fixtures/constants';
import { postConverse } from '../fixtures/converse_http';

apiTest.describe('Agent Builder — SML internal API', { tag: [...tags.stateful.classic] }, () => {
  let adminInteractiveCookieHeader: Record<string, string>;
  let sysEsClient: Client;

  // Shared search-test entry: indexed once and reused by hit, wildcard,
  // and compact-shape assertions so the index is never empty
  const searchRunId = randomUUID();
  const searchEntryId = `sml-autocomplete-${searchRunId}`;
  const searchOriginId = `sml-origin-${searchRunId}`;
  const searchIndexedTitle = `sml autocomplete pacific bluefin ${searchRunId}`;

  apiTest.beforeAll(async ({ samlAuth, esClient, config }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    adminInteractiveCookieHeader = cookieHeader;
    sysEsClient = await createSystemIndicesEsClient(esClient, config);
    const exists = await sysEsClient.indices.exists({ index: smlIndexName });
    if (!exists) {
      await sysEsClient.indices.create({
        index: smlIndexName,
        mappings: smlElasticsearchIndexMappings,
      });
    }

    const now = '2024-06-01T12:00:00.000Z';
    await sysEsClient.index({
      index: smlIndexName,
      id: searchEntryId,
      refresh: 'wait_for',
      document: {
        id: searchEntryId,
        type: 'visualization',
        title: searchIndexedTitle,
        origin: { uri: `visualization://${searchOriginId}` },
        content: 'pacific bluefin tuna content for sml scout',
        created_at: now,
        updated_at: now,
        spaces: ['default'],
        permissions: { kibana: { privileges: [] } },
        ingestion_method: 'crawled',
      },
    });
  });

  apiTest.afterAll(async () => {
    try {
      await sysEsClient.delete({ index: smlIndexName, id: searchEntryId, refresh: true });
    } catch {
      // ignore — already cleaned up
    }
  });

  const ih = () => ({
    ...COMMON_HEADERS,
    ...adminInteractiveCookieHeader,
  });

  apiTest('POST /internal/agent_builder_sml/sml/_search autocomplete', async ({ apiClient }) => {
    const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER_SML}/sml/_search`, {
      headers: ih(),
      body: { query: 'pacif', size: 20 },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    const body = response.body as SmlSearchHttpResponse;
    const match = body.results.find((r) => r.id === searchEntryId);
    expect(match).toBeDefined();
    expect(match?.title).toContain('pacific');
    expect(match?.origin?.uri).toBe(`visualization://${searchOriginId}`);
    expect(match?.type).toBe('visualization');
  });

  apiTest(
    'POST /internal/agent_builder_sml/sml/_search wildcard returns item fields',
    async ({ apiClient }) => {
      const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER_SML}/sml/_search`, {
        headers: ih(),
        body: { query: '*', size: 10 },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const body = response.body as SmlSearchHttpResponse;
      expect(Array.isArray(body.results)).toBe(true);
      for (const item of body.results) {
        expect(typeof item.id).toBe('string');
        expect(typeof item.origin?.uri).toBe('string');
        expect(typeof item.type).toBe('string');
        expect(typeof item.title).toBe('string');
      }
    }
  );

  apiTest(
    'POST /internal/agent_builder_sml/sml/_search rejects empty query',
    async ({ apiClient }) => {
      const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER_SML}/sml/_search`, {
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
          conversation_id: 'non-existent-conversation-id-for-sml-attach-scout',
          entry_ids: ['irrelevant-entry-id-for-sml-attach-scout'],
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
    'POST /internal/agent_builder/sml/_attach attaches entry and persists attachment refs',
    async ({ apiClient, asAdmin, log, kbnClient }) => {
      const runId = randomUUID();
      const entryId = `sml-scout-attach-${runId}`;
      const indexedTitle = `sml scout attach ${runId}`;
      const llmProxy = await createLlmProxy(log);
      const { id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy);

      const now = '2024-06-01T12:00:00.000Z';
      await sysEsClient.index({
        index: smlIndexName,
        id: entryId,
        refresh: 'wait_for',
        document: {
          id: entryId,
          type: 'connector',
          title: indexedTitle,
          origin: { uri: `connector://${connectorId}` },
          content: `attach content for ${runId}`,
          created_at: now,
          updated_at: now,
          spaces: ['default'],
          permissions: { kibana: { privileges: [] } },
          ingestion_method: 'crawled',
        },
      });

      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: `SML attach title ${runId}`,
        response: 'SML attach response',
      });
      const converseRes = await postConverse(
        asAdmin,
        {},
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
        body: { conversation_id: conversationId, entry_ids: [entryId] },
        responseType: 'json',
      });
      expect(attachResponse).toHaveStatusCode(200);
      const attachBody = attachResponse.body as SmlAttachHttpResponse;
      expect(attachBody.results).toHaveLength(1);
      expect(attachBody.results[0].success).toBe(true);

      const conversation = await asAdmin.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
        { responseType: 'json' }
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

      await asAdmin.delete(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`
      );
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
      try {
        await sysEsClient.delete({ index: smlIndexName, id: entryId, refresh: true });
      } catch {
        // ignore — document may have been cleaned up by SML auto-indexing
      }
    }
  );
});
