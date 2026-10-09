/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import {
  API_STATE_CHANGED_UI_EVENT,
  ChatEventType,
  ToolResultType,
  type ApiStateChangedEventData,
} from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentCallToolThenAnswer } from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import { chatApiPath } from '../../../../../common/constants';
import { apiTest, API_AGENT_BUILDER, COMMON_HEADERS } from '../fixtures';

const CHAT_CONVERSE_ASYNC = `${chatApiPath}/converse/async`;
const CREATED_AGENT_ID = 'scout-api-state-changes-agent';

interface ParsedSseBlock {
  type: string;
  data: {
    data?: {
      conversation_id?: string;
      tool_id?: string;
      custom_event?: string;
      data?: ApiStateChangedEventData;
      results?: Array<{ type: string }>;
    };
  };
}

const parseSseBlocks = (streamText: string): ParsedSseBlock[] => {
  const blocks: ParsedSseBlock[] = [];
  for (const block of streamText.split('\n\n')) {
    const lines = block.split('\n');
    const eventType = lines
      .find((line) => line.startsWith('event:'))
      ?.slice('event:'.length)
      .trim();
    const dataLine = lines.find((line) => line.startsWith('data:'));
    if (!eventType || !dataLine) {
      continue;
    }
    try {
      blocks.push({ type: eventType, data: JSON.parse(dataLine.slice('data:'.length).trim()) });
    } catch {
      // Not a JSON data line, skip it.
    }
  }
  return blocks;
};

const getConversationId = (blocks: ParsedSseBlock[]): string => {
  const conversationId = blocks.find(
    ({ type, data }) =>
      (type === ChatEventType.conversationCreated || type === ChatEventType.conversationUpdated) &&
      typeof data?.data?.conversation_id === 'string'
  )?.data.data?.conversation_id;
  if (!conversationId) {
    throw new Error('expected a conversation_id in the SSE stream');
  }
  return conversationId;
};

const getApiStateChangedPayloads = (blocks: ParsedSseBlock[]) =>
  blocks
    .filter(
      ({ type, data }) =>
        type === ChatEventType.toolUi && data?.data?.custom_event === API_STATE_CHANGED_UI_EVENT
    )
    .map(({ data }) => data.data);

const getExecuteApiResultTypes = (blocks: ParsedSseBlock[]) =>
  blocks
    .filter(
      ({ type, data }) =>
        type === ChatEventType.toolResult && data?.data?.tool_id === internalTools.executeApi
    )
    .flatMap(({ data }) => data.data?.results ?? [])
    .map((result) => result.type);

apiTest.describe(
  'Agent Builder — execute_api state change events',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let llmProxy: LlmProxy;
    let connectorId: string;
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      llmProxy = await createLlmProxy(log);
      ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      await asAdmin.delete(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(CREATED_AGENT_ID)}`);
      for (const id of conversationIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`);
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    const converseWithExecuteApi = async (
      apiClient: ApiClientFixture,
      toolArg: Record<string, unknown>
    ): Promise<ParsedSseBlock[]> => {
      setupAgentCallToolThenAnswer({
        proxy: llmProxy,
        toolName: internalTools.executeApi,
        toolArg,
        response: 'Done',
      });

      const res = await apiClient.post(CHAT_CONVERSE_ASYNC, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: { input: 'Run the API call', connector_id: connectorId, _execution_mode: 'local' },
        responseType: 'buffer',
      });
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      expect(res).toHaveStatusCode(200);
      const blocks = parseSseBlocks((res.body as Buffer).toString('utf8'));
      conversationIds.push(getConversationId(blocks));
      return blocks;
    };

    apiTest(
      'a successful create call sends one api_state_changed event',
      async ({ apiClient, asAdmin }) => {
        const blocks = await converseWithExecuteApi(apiClient, {
          target: 'kibana',
          api: 'agent-builder.post-agent-builder-agents',
          params: {
            id: CREATED_AGENT_ID,
            name: 'Scout API state changes agent',
            description: 'Created by the execute_api state change events test',
            configuration: { tools: [] },
          },
        });

        expect(getExecuteApiResultTypes(blocks)).toStrictEqual([ToolResultType.other]);

        const payloads = getApiStateChangedPayloads(blocks);
        expect(payloads, `expected one ${API_STATE_CHANGED_UI_EVENT} tool_ui event`).toHaveLength(
          1
        );
        expect(payloads[0]).toMatchObject({
          tool_id: internalTools.executeApi,
          data: {
            target: 'kibana',
            api: 'agent-builder.post-agent-builder-agents',
            method: 'POST',
            path: '/api/agent_builder/agents',
          },
        });

        const created = await asAdmin.get(
          `${API_AGENT_BUILDER}/agents/${encodeURIComponent(CREATED_AGENT_ID)}`
        );
        expect(created).toHaveStatusCode(200);
      }
    );

    apiTest(
      'a successful read-only call sends no api_state_changed event',
      async ({ apiClient }) => {
        const blocks = await converseWithExecuteApi(apiClient, {
          target: 'kibana',
          api: 'agent-builder.get-agent-builder-agents',
          params: {},
        });

        expect(getExecuteApiResultTypes(blocks)).toStrictEqual([ToolResultType.other]);
        expect(getApiStateChangedPayloads(blocks)).toHaveLength(0);
      }
    );
  }
);
