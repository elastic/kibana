/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { createVisualizationGraph } from './graph_lens';
import type { VisualizationConfig } from './types';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
}));

jest.mock('./chart_type_registry', () => ({
  chartTypeRegistry: new Proxy(
    {},
    {
      get: () => ({
        schema: {
          validate: (config: unknown) => config,
        },
        prompt: {
          selection: {
            description: 'Mock chart description',
            guideline: 'Mock chart guideline',
          },
        },
      }),
    }
  ),
}));

const mockedGenerateEsql = jest.mocked(generateEsql);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('createVisualizationGraph', () => {
  const logger = createMockLogger();
  const events = {} as ToolEventEmitter;
  const esClient = { asCurrentUser: {} } as IScopedClusterClient;

  const createMockModel = () =>
    ({
      chatModel: {
        invoke: jest.fn().mockResolvedValue('```json\n{"type":"metric"}\n```'),
        withStructuredOutput: jest.fn(),
      },
    } as const);

  beforeEach(() => {
    mockedGenerateEsql.mockReset();
  });

  it('uses the provided esql query without generating a new one', async () => {
    const graph = createVisualizationGraph(
      createMockModel() as never,
      logger,
      events,
      esClient,
      false
    );
    const esqlQuery = 'FROM logs-* | WHERE response.code != 503 | STATS count = COUNT(*)';

    const finalState = await graph.invoke({
      nlQuery: 'Exclude 503 response codes',
      index: 'logs-*',
      chartType: SupportedChartType.Metric,
      schema: {},
      existingConfig: undefined,
      parsedExistingConfig: null,
      esqlQuery,
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });

    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    expect(finalState.esqlQuery).toBe(esqlQuery);
  });

  it('regenerates esql for edits and includes the existing query as context', async () => {
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | WHERE response.code != 503 | STATS count = COUNT(*)',
    } as Awaited<ReturnType<typeof generateEsql>>);

    const graph = createVisualizationGraph(
      createMockModel() as never,
      logger,
      events,
      esClient,
      false
    );
    const parsedExistingConfig = {
      type: 'metric',
      dataset: {
        type: 'esql',
        query: 'FROM logs-* | STATS count = COUNT(*)',
      },
    } as unknown as VisualizationConfig;

    const finalState = await graph.invoke({
      nlQuery: 'Exclude 503 response codes',
      index: 'logs-*',
      chartType: SupportedChartType.Metric,
      schema: {},
      existingConfig: JSON.stringify(parsedExistingConfig),
      parsedExistingConfig,
      esqlQuery: '',
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });

    expect(mockedGenerateEsql).toHaveBeenCalledWith(
      expect.objectContaining({
        nlQuery: expect.stringContaining(
          'Existing esql query to modify: "FROM logs-* | STATS count = COUNT(*)"'
        ),
      })
    );
    expect(finalState.esqlQuery).toBe(
      'FROM logs-* | WHERE response.code != 503 | STATS count = COUNT(*)'
    );
  });
});
