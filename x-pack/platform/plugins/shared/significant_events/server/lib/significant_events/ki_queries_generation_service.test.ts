/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { Streams } from '@kbn/streams-schema';
import type { EbtTelemetryClient } from '../telemetry/ebt';
import {
  generateKIQueries,
  type GenerateKIQueriesDependencies,
} from './ki_queries_generation_service';
import { executeKIQueryGenerationAgent } from './identify_ki_queries_via_agent';

jest.mock('./identify_ki_queries_via_agent', () => ({
  executeKIQueryGenerationAgent: jest.fn(),
}));

const executeKIQueryGenerationAgentMock = executeKIQueryGenerationAgent as jest.MockedFunction<
  typeof executeKIQueryGenerationAgent
>;

const definition = { name: 'logs.test' } as Streams.all.Definition;

const makeDeps = (
  overrides: Partial<GenerateKIQueriesDependencies> = {}
): GenerateKIQueriesDependencies => ({
  streamsClient: {
    getStream: jest.fn().mockResolvedValue(definition),
  } as unknown as GenerateKIQueriesDependencies['streamsClient'],
  agentBuilder: {} as AgentBuilderPluginStart,
  searchInferenceEndpoints: undefined,
  request: {} as GenerateKIQueriesDependencies['request'],
  logger: loggerMock.create(),
  signal: new AbortController().signal,
  telemetry: {
    trackSignificantEventsQueriesGenerated: jest.fn(),
  } as unknown as EbtTelemetryClient,
  ...overrides,
});

describe('generateKIQueries', () => {
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = loggerMock.create();
    executeKIQueryGenerationAgentMock.mockReset();
    executeKIQueryGenerationAgentMock.mockResolvedValue({
      queries: [
        {
          type: 'match',
          title: 'Detects failures',
          description: 'A query',
          esql: { query: 'FROM logs | WHERE message == "fail"' },
          evidence: ['evidence'],
          features: [],
          severity_score: 70,
        },
      ],
      tokensUsed: { prompt: 10, completion: 20, total: 30, cached: 0 },
    });
  });

  it('reports telemetry with count, connector_id, and token usage', async () => {
    const telemetry = {
      trackSignificantEventsQueriesGenerated: jest.fn(),
    } as unknown as EbtTelemetryClient;

    await generateKIQueries(
      { streamName: 'logs.test', connectorId: 'test-connector' },
      makeDeps({ telemetry, logger })
    );

    expect(telemetry.trackSignificantEventsQueriesGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        connector_id: 'test-connector',
        input_tokens_used: 10,
        output_tokens_used: 20,
      })
    );
  });

  it('returns only queries, tokensUsed, and connectorId', async () => {
    const telemetry = {
      trackSignificantEventsQueriesGenerated: jest.fn(),
    } as unknown as EbtTelemetryClient;

    const result = await generateKIQueries(
      { streamName: 'logs.test', connectorId: 'test-connector' },
      makeDeps({ telemetry, logger })
    );

    expect(result).toEqual({
      queries: [
        {
          type: 'match',
          title: 'Detects failures',
          description: 'A query',
          esql: { query: 'FROM logs | WHERE message == "fail"' },
          evidence: ['evidence'],
          features: [],
          severity_score: 70,
        },
      ],
      tokensUsed: { prompt: 10, completion: 20, total: 30, cached: 0 },
      connectorId: 'test-connector',
    });
  });
});
