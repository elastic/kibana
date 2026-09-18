/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { ChatEventType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { Streams } from '@kbn/streams-schema';
import { SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID } from '../../agent_builder/skills/ki_query_generation';
import { executeKIQueryGenerationAgent } from './identify_ki_queries_via_agent';

describe('executeKIQueryGenerationAgent', () => {
  it('returns finalized queries from the latest validation result', async () => {
    const validatedQuery = {
      type: 'match' as const,
      title: 'Validated query',
      description: 'Detects validated failures',
      esql: { query: 'FROM logs.test | WHERE message:"failure"' },
      category: 'error' as const,
      severity_score: 60,
      features: [{ id: 'feature-1', run_id: 'run-1' }],
    };
    const executeAgent = jest.fn().mockResolvedValue({
      events$: of(
        {
          type: ChatEventType.toolResult,
          data: {
            tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
            tool_call_id: 'validate-1',
            results: [
              {
                type: ToolResultType.other,
                data: {
                  finalized: true,
                  finalized_queries: [
                    { ...validatedQuery, esql: { query: 'FROM superseded-validation' } },
                  ],
                },
              },
            ],
          },
        },
        {
          type: ChatEventType.toolResult,
          data: {
            tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
            tool_call_id: 'validate-2',
            results: [
              {
                type: ToolResultType.other,
                data: { finalized: true, finalized_queries: [validatedQuery] },
              },
            ],
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
    const request = {} as KibanaRequest;
    const agentBuilder = {
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue({
          create: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
        }),
      },
      execution: { executeAgent },
    } as unknown as AgentBuilderPluginStart;
    const definition: Streams.WiredStream.Definition = {
      name: 'logs.test',
      description: 'Test logs',
      updated_at: new Date().toISOString(),
      type: 'wired',
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [], updated_at: new Date().toISOString() },
        settings: {},
        failure_store: { inherit: {} },
        wired: { fields: {}, routing: [] },
      },
    };

    await expect(
      executeKIQueryGenerationAgent({
        agentBuilder,
        request,
        connectorId: 'connector-1',
        definition,
        logger: loggerMock.create(),
      })
    ).resolves.toEqual({
      queries: [
        {
          type: 'match',
          title: 'Validated query',
          description: 'Detects validated failures',
          esql: { query: 'FROM logs.test | WHERE message:"failure"' },
          severity_score: 60,
          evidence: undefined,
          replaces: undefined,
          features: [{ id: 'feature-1', run_id: 'run-1' }],
        },
      ],
      tokensUsed: {
        prompt: 10,
        completion: 5,
        total: 15,
        cached: 2,
      },
    });
  });
});
