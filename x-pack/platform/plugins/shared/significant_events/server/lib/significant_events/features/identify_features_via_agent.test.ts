/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { AgentExecutionMode, ChatEventType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { FEATURE_IDENTIFICATION_AGENT_ID } from '../../../agent_builder/agents/feature_identification';
import { FINALIZE_FEATURES_TOOL_ID } from '../../../agent_builder/skills/feature_identification';
import { executeFeatureIdentificationAgent } from './identify_features_via_agent';

describe('executeFeatureIdentificationAgent', () => {
  it('persists into a pre-titled private conversation and returns finalized features', async () => {
    const createConversation = jest.fn().mockResolvedValue({ id: 'conversation-1' });
    const executeAgent = jest.fn().mockResolvedValue({
      events$: of(
        {
          type: ChatEventType.toolCall,
          data: {
            tool_id: FINALIZE_FEATURES_TOOL_ID,
            tool_call_id: 'failed-finalize',
            params: {},
          },
        },
        {
          type: ChatEventType.toolResult,
          data: {
            tool_id: FINALIZE_FEATURES_TOOL_ID,
            tool_call_id: 'failed-finalize',
            results: [{ type: ToolResultType.error, data: { message: 'Invalid parameters' } }],
          },
        },
        {
          type: ChatEventType.toolCall,
          data: {
            tool_id: FINALIZE_FEATURES_TOOL_ID,
            tool_call_id: 'successful-finalize',
            params: {
              features: [],
              ignored_features: [],
            },
          },
        },
        {
          type: ChatEventType.toolResult,
          data: {
            tool_id: FINALIZE_FEATURES_TOOL_ID,
            tool_call_id: 'successful-finalize',
            results: [{ type: ToolResultType.other, data: { finalized: true } }],
          },
        },
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              model_usage: {
                input_tokens: 10,
                output_tokens: 5,
                cached_input_tokens: 2,
              },
            },
          },
        }
      ),
    });
    const agentBuilder = {
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue({ create: createConversation }),
      },
      execution: { executeAgent },
    } as unknown as AgentBuilderPluginStart;
    const request = {} as KibanaRequest;

    await expect(
      executeFeatureIdentificationAgent({
        agentBuilder,
        request,
        connectorId: 'connector-1',
        streamName: 'logs.test',
        sampleDocuments: [{ _id: 'doc-1', fields: { message: 'hello' } }],
        logger: loggerMock.create(),
      })
    ).resolves.toEqual({
      features: [],
      ignoredFeatures: [],
      tokensUsed: {
        prompt: 10,
        completion: 5,
        total: 15,
        cached: 2,
      },
    });

    expect(agentBuilder.conversations.getScopedClient).toHaveBeenCalledWith({ request });
    expect(createConversation).toHaveBeenCalledWith({
      agentId: FEATURE_IDENTIFICATION_AGENT_ID,
      title: 'Feature identification: logs.test',
      accessControl: { access_mode: 'private' },
    });
    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: AgentExecutionMode.conversation,
        request,
        params: expect.objectContaining({
          agentId: FEATURE_IDENTIFICATION_AGENT_ID,
          connectorId: 'connector-1',
          conversationId: 'conversation-1',
          storeConversation: true,
          nextInput: {
            message: expect.stringContaining('`sample_documents`:'),
          },
        }),
      })
    );
    const executionParams = executeAgent.mock.calls[0][0].params;
    expect(executionParams).not.toHaveProperty('structuredOutput');
    expect(executionParams).not.toHaveProperty('outputSchema');
  });
});
