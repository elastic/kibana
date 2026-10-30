/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  contextEngineAiIndexTools,
  contextEngineMemoryTools,
} from '@kbn/agent-builder-common/tools';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { randomUUID } from 'crypto';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentCallToolThenAnswer } from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest, API_AGENT_BUILDER, COMMON_HEADERS, postConverse } from '../fixtures';

const RUN_ID = Date.now().toString(36);
const AI_INDEX_ID = `scout-memory-agent-e2e-${RUN_ID}`;
const DESTINATION_INDEX = `ai-index-idx-scout-memory-agent-e2e-${RUN_ID}`;
const AGENT_ID = `scout-memory-agent-e2e-${RUN_ID}`;
const REMEMBER_CONVERSATION_ID = randomUUID();
const RECALL_CONVERSATION_ID = randomUUID();
const AI_INDEX_COLLECTION_PATH = '/api/context_engine/ai_index';
const MEMORY_CONTENT = 'Project Atlas uses deployment code cobalt-731.';
const API_HEADERS = {
  ...COMMON_HEADERS,
  'elastic-api-version': '2023-10-31',
};

const toLlmToolName = (toolId: string) => toolId.replaceAll('.', '_');
const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

interface ConverseResponse {
  conversation_id: string;
  response: {
    message: string;
  };
}

interface StoredMemory {
  type: string;
  title: string;
  content: string;
  references?: Array<{ uri: string; relation?: string }>;
  governance?: {
    provenance?: {
      created_by?: {
        uri: string;
        metadata: Record<string, string>;
      };
    };
  };
}

apiTest.describe(
  'Agent Builder — Context Engine Memory end to end',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let credentials: RoleApiCredentials | undefined;
    let llmProxy: LlmProxy | undefined;
    let connectorId: string | undefined;
    let previousMemoryEnabled: boolean | undefined;
    const conversationIds = [REMEMBER_CONVERSATION_ID, RECALL_CONVERSATION_ID];

    apiTest.beforeAll(async ({ apiClient, kbnClient, log, requestAuth }) => {
      credentials = await requestAuth.getApiKeyForAdmin();
      const headers = { ...credentials.apiKeyHeader, ...API_HEADERS };

      const globalSettingsResponse = await apiClient.get('/internal/kibana/global_settings', {
        headers,
        responseType: 'json',
      });
      expect(globalSettingsResponse).toHaveStatusCode(200);
      previousMemoryEnabled =
        globalSettingsResponse.body.settings?.[CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]?.userValue;
      await kbnClient.uiSettings.updateGlobal({
        [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: true,
      });
      await kbnClient.uiSettings.waitForEventualCacheRefresh();

      const aiIndexResponse = await apiClient.put(`${AI_INDEX_COLLECTION_PATH}/${AI_INDEX_ID}`, {
        headers,
        responseType: 'json',
        body: {
          dest: { type: 'index', value: DESTINATION_INDEX },
          memory_enabled: true,
          automations: [],
          sources: [],
          traces: [],
        },
      });
      expect(aiIndexResponse).toHaveStatusCode(201);

      const agentResponse = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers,
        responseType: 'json',
        body: {
          id: AGENT_ID,
          name: 'Memory end-to-end test agent',
          description: 'Exercises Memory across separate Agent Builder conversations.',
          configuration: {
            instructions: 'Use the configured Context Engine AI index when explicitly requested.',
            tools: [],
            ai_indices: [AI_INDEX_ID],
          },
        },
      });
      expect(agentResponse).toHaveStatusCode(200);

      llmProxy = await createLlmProxy(log);
      const connector = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = connector.id;
    });

    apiTest.afterAll(async ({ apiClient, esClient, kbnClient }) => {
      if (credentials === undefined) {
        llmProxy?.close();
        return;
      }
      const headers = { ...credentials.apiKeyHeader, ...API_HEADERS };
      const cleanupErrors: string[] = [];
      const cleanup = async (label: string, operation: () => Promise<void>) => {
        try {
          await operation();
        } catch (error) {
          cleanupErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
        }
      };

      for (const conversationId of conversationIds) {
        await cleanup(`conversation ${conversationId}`, async () => {
          const response = await apiClient.delete(
            `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
            { headers, responseType: 'json' }
          );
          if (response.statusCode !== 200 && response.statusCode !== 404) {
            throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(response.body)}`);
          }
        });
      }
      await cleanup(`agent ${AGENT_ID}`, async () => {
        const response = await apiClient.delete(
          `${API_AGENT_BUILDER}/agents/${encodeURIComponent(AGENT_ID)}`,
          {
            headers,
            responseType: 'json',
          }
        );
        if (response.statusCode !== 200 && response.statusCode !== 404) {
          throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(response.body)}`);
        }
      });
      await cleanup(`AI index ${AI_INDEX_ID}`, async () => {
        const response = await apiClient.delete(
          `${AI_INDEX_COLLECTION_PATH}/${AI_INDEX_ID}?delete_knowledge_indicators=true`,
          { headers, responseType: 'json' }
        );
        if (response.statusCode === 200) {
          const body = asRecord(response.body);
          const errors = Array.isArray(body?.errors) ? body.errors : [];
          if (body?.acknowledged !== true || errors.length > 0) {
            throw new Error(JSON.stringify(response.body));
          }
        } else if (response.statusCode !== 404) {
          throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(response.body)}`);
        }
      });
      await cleanup(`backing index ${DESTINATION_INDEX}`, async () => {
        await esClient.indices.delete({ index: DESTINATION_INDEX }, { ignore: [404] });
      });

      if (connectorId !== undefined) {
        const createdConnectorId = connectorId;
        await cleanup(`connector ${createdConnectorId}`, async () => {
          await deleteConnectorById(kbnClient, createdConnectorId);
        });
      }
      try {
        llmProxy?.close();
      } catch (error) {
        cleanupErrors.push(`LLM proxy: ${error instanceof Error ? error.message : String(error)}`);
      }

      await cleanup('global Memory setting', async () => {
        if (previousMemoryEnabled === undefined) {
          const response = await apiClient.delete(
            `/internal/kibana/global_settings/${encodeURIComponent(
              CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID
            )}`,
            { headers, responseType: 'json' }
          );
          if (response.statusCode !== 200) {
            throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(response.body)}`);
          }
        } else {
          await kbnClient.uiSettings.updateGlobal({
            [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: previousMemoryEnabled,
          });
        }
        await kbnClient.uiSettings.waitForEventualCacheRefresh();
      });

      if (cleanupErrors.length > 0) {
        throw new Error(`Memory end-to-end cleanup failed:\n${cleanupErrors.join('\n')}`);
      }
    });

    apiTest(
      'writes a memory in one conversation and retrieves it in another',
      async ({ apiClient, esClient }) => {
        expect(credentials).toBeDefined();
        expect(llmProxy).toBeDefined();
        expect(connectorId).toBeDefined();
        const testCredentials = credentials as RoleApiCredentials;
        const proxy = llmProxy as LlmProxy;
        const testConnectorId = connectorId as string;

        setupAgentCallToolThenAnswer({
          proxy,
          continueConversation: true,
          toolName: toLlmToolName(contextEngineMemoryTools.remember),
          toolArg: {
            aiIndexId: AI_INDEX_ID,
            type: 'memory.session_fact',
            title: 'Project Atlas deployment code',
            description: 'The deployment code used by Project Atlas.',
            content: MEMORY_CONTENT,
            expires_at: null,
          },
          response: 'I will remember the Project Atlas deployment code.',
        });

        const rememberResponse = await postConverse(
          apiClient,
          testCredentials.apiKeyHeader,
          {
            conversation_id: REMEMBER_CONVERSATION_ID,
            input: `Remember this shared project fact: ${MEMORY_CONTENT}`,
            agent_id: AGENT_ID,
            connector_id: testConnectorId,
          },
          'local'
        );
        expect(rememberResponse).toHaveStatusCode(200);
        const rememberBody = rememberResponse.body as ConverseResponse;
        expect(rememberBody.conversation_id).toBe(REMEMBER_CONVERSATION_ID);
        expect(rememberBody.response.message).toBe(
          'I will remember the Project Atlas deployment code.'
        );
        await proxy.waitForAllInterceptorsToHaveBeenCalled();

        const storedMemories = await esClient.search<StoredMemory>({
          index: DESTINATION_INDEX,
          query: { term: { type: 'memory.session_fact' } },
        });
        expect(storedMemories.hits.hits).toHaveLength(1);
        expect(storedMemories.hits.hits[0]._source).toMatchObject({
          type: 'memory.session_fact',
          title: 'Project Atlas deployment code',
          content: MEMORY_CONTENT,
          references: [
            {
              uri: `conversation://${rememberBody.conversation_id}`,
              relation: 'derived_from',
            },
          ],
          governance: {
            provenance: {
              created_by: {
                uri: `tool://${contextEngineMemoryTools.remember}`,
                metadata: { agent_id: AGENT_ID },
              },
            },
          },
        });

        setupAgentCallToolThenAnswer({
          proxy,
          continueConversation: true,
          toolName: toLlmToolName(contextEngineAiIndexTools.queryAiIndices),
          toolArg: {
            query: `FROM ${DESTINATION_INDEX} | WHERE type == "memory.session_fact" | KEEP title, content | LIMIT 10`,
            limit: 10,
          },
          response: MEMORY_CONTENT,
        });

        const recallResponse = await postConverse(
          apiClient,
          testCredentials.apiKeyHeader,
          {
            conversation_id: RECALL_CONVERSATION_ID,
            input: 'What deployment code does Project Atlas use? Search the configured AI index.',
            agent_id: AGENT_ID,
            connector_id: testConnectorId,
          },
          'local'
        );
        expect(recallResponse).toHaveStatusCode(200);
        const recallBody = recallResponse.body as ConverseResponse;
        expect(recallBody.conversation_id).toBe(RECALL_CONVERSATION_ID);
        expect(recallBody.conversation_id).not.toBe(rememberBody.conversation_id);
        expect(recallBody.response.message).toBe(MEMORY_CONTENT);
        await proxy.waitForAllInterceptorsToHaveBeenCalled();

        const finalModelRequests = proxy.interceptedRequests.filter(
          ({ matchingInterceptorName }) => matchingInterceptorName === 'final-assistant-response'
        );
        const recallFinalRequest = finalModelRequests.at(-1)?.requestBody;
        expect(recallFinalRequest).toBeDefined();
        expect(JSON.stringify(recallFinalRequest)).toContain(MEMORY_CONTENT);
      }
    );
  }
);
