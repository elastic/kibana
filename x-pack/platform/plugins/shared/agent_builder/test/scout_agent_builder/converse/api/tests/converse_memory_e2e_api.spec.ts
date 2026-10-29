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
const AI_INDEX_COLLECTION_PATH = '/api/context_engine/ai_index';
const MEMORY_CONTENT = 'Project Atlas uses deployment code cobalt-731.';
const API_HEADERS = {
  ...COMMON_HEADERS,
  'elastic-api-version': '2023-10-31',
};

const toLlmToolName = (toolId: string) => toolId.replaceAll('.', '_');

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
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, log, requestAuth }) => {
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

      await esClient.indices.create({ index: DESTINATION_INDEX });
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
            tools: [
              {
                tool_ids: [
                  contextEngineMemoryTools.remember,
                  contextEngineAiIndexTools.queryAiIndices,
                ],
              },
            ],
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

      for (const conversationId of conversationIds) {
        await apiClient.delete(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
          { headers, responseType: 'json' }
        );
      }
      await apiClient.delete(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(AGENT_ID)}`, {
        headers,
        responseType: 'json',
      });
      await apiClient.delete(`${AI_INDEX_COLLECTION_PATH}/${AI_INDEX_ID}`, {
        headers,
        responseType: 'json',
      });
      await esClient.indices.delete({ index: DESTINATION_INDEX }, { ignore: [404] });

      if (connectorId !== undefined) {
        await deleteConnectorById(kbnClient, connectorId);
      }
      llmProxy?.close();

      if (previousMemoryEnabled === undefined) {
        await apiClient.delete(
          `/internal/kibana/global_settings/${encodeURIComponent(
            CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID
          )}`,
          { headers, responseType: 'json' }
        );
      } else {
        await kbnClient.uiSettings.updateGlobal({
          [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: previousMemoryEnabled,
        });
      }
      await kbnClient.uiSettings.waitForEventualCacheRefresh();
    });

    apiTest(
      'writes a memory in one conversation and retrieves it in another',
      async ({ apiClient, esClient }) => {
        if (credentials === undefined || llmProxy === undefined || connectorId === undefined) {
          throw new Error('The test credentials and LLM proxy connector were not initialized.');
        }

        setupAgentCallToolThenAnswer({
          proxy: llmProxy,
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
          credentials.apiKeyHeader,
          {
            input: `Remember this shared project fact: ${MEMORY_CONTENT}`,
            agent_id: AGENT_ID,
            connector_id: connectorId,
          },
          'local'
        );
        expect(rememberResponse).toHaveStatusCode(200);
        const rememberBody = rememberResponse.body as ConverseResponse;
        conversationIds.push(rememberBody.conversation_id);
        expect(rememberBody.response.message).toBe(
          'I will remember the Project Atlas deployment code.'
        );
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

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
          proxy: llmProxy,
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
          credentials.apiKeyHeader,
          {
            input: 'What deployment code does Project Atlas use? Search the configured AI index.',
            agent_id: AGENT_ID,
            connector_id: connectorId,
          },
          'local'
        );
        expect(recallResponse).toHaveStatusCode(200);
        const recallBody = recallResponse.body as ConverseResponse;
        conversationIds.push(recallBody.conversation_id);
        expect(recallBody.conversation_id).not.toBe(rememberBody.conversation_id);
        expect(recallBody.response.message).toBe(MEMORY_CONTENT);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const finalModelRequests = llmProxy.interceptedRequests.filter(
          ({ matchingInterceptorName }) => matchingInterceptorName === 'final-assistant-response'
        );
        const recallFinalRequest = finalModelRequests.at(-1)?.requestBody;
        expect(recallFinalRequest).toBeDefined();
        expect(JSON.stringify(recallFinalRequest)).toContain(MEMORY_CONTENT);
      }
    );
  }
);
