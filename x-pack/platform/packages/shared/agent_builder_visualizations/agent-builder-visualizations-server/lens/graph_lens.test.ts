/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import { EsqlService } from '@kbn/esql-server-utils';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { createVisualizationGraph } from './graph_lens';
import type { ProbedColumn } from './probe_columns';
import type { VisualizationConfig } from './types';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
}));

const mockGetColumns = jest.fn();

jest.mock('@kbn/esql-server-utils', () => ({
  EsqlService: jest.fn().mockImplementation(() => ({
    getColumns: (...args: unknown[]) => mockGetColumns(...args),
  })),
}));

const mockedGenerateEsql = jest.mocked(generateEsql);
const mockedEsqlService = jest.mocked(EsqlService);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const asAuthoringResponse = (
  config: Record<string, unknown>,
  authoringNote = 'Created a visualization using the requested data.'
): string => `\`\`\`json\n${JSON.stringify({ authoring_note: authoringNote, config })}\n\`\`\``;

const COUNT_QUERY = 'FROM logs-* | STATS count = COUNT(*)';

describe('createVisualizationGraph', () => {
  const logger = createMockLogger();
  const events = {} as ToolEventEmitter;
  const esClient = { asCurrentUser: {} } as IScopedClusterClient;

  const createMockModel = (
    invokeResult: string = asAuthoringResponse({
      type: 'metric',
      metrics: [{ type: 'primary', column: 'count' }],
    })
  ) => {
    const defaultChat = {
      invoke: jest.fn().mockResolvedValue({ content: invokeResult }),
    };
    const fallbackChat = {
      invoke: jest.fn().mockResolvedValue({ content: '{"column":"bytes"}' }),
    };
    const defaultModel = {
      connector: { connectorId: 'default-connector' },
      chatModel: defaultChat,
    };
    const fallbackModel = {
      connector: { connectorId: 'low-connector' },
      chatModel: fallbackChat,
    };
    return {
      getDefaultModel: jest.fn().mockResolvedValue(defaultModel),
      selectModel: jest.fn().mockResolvedValue(fallbackModel),
      defaultChat,
      fallbackChat,
    };
  };

  const baseState = (overrides: Record<string, unknown> = {}) => ({
    nlQuery: 'Count logs',
    index: 'logs-*',
    chartType: SupportedChartType.Metric,
    existingConfig: undefined,
    parsedExistingConfig: null,
    esqlQuery: COUNT_QUERY,
    columns: [] as ProbedColumn[],
    intent: undefined,
    title: undefined,
    styleOverrides: undefined,
    styleRequest: undefined,
    compileAllowList: Object.values(SupportedChartType),
    validatedConfig: null,
    authoringNote: null,
    error: null,
    ...overrides,
  });

  beforeEach(() => {
    mockedGenerateEsql.mockReset();
    mockGetColumns.mockReset();
    mockGetColumns.mockResolvedValue([{ name: 'count', type: 'long' }]);
    mockedEsqlService.mockClear();
  });

  it('compiles a metric from provided ES|QL without generating a query or invoking the author', async () => {
    const model = createMockModel();
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);

    const finalState = await graph.invoke(baseState());

    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    expect(mockGetColumns).toHaveBeenCalledWith(COUNT_QUERY, [
      { _tstart: expect.any(String) },
      { _tend: expect.any(String) },
    ]);
    expect(model.defaultChat.invoke).not.toHaveBeenCalled();
    expect(model.fallbackChat.invoke).not.toHaveBeenCalled();
    expect(finalState.authoringNote).toBeNull();
    expect(finalState.esqlQuery).toBe(COUNT_QUERY);
    expect(finalState.validatedConfig).toMatchObject({
      type: 'metric',
      metrics: [{ type: 'primary', column: 'count' }],
      data_source: { type: 'esql', query: COUNT_QUERY },
    });
  });

  it('uses the provided esql query without generating a new one', async () => {
    const graph = await createVisualizationGraph(
      createMockModel() as never,
      logger,
      events,
      esClient
    );

    const finalState = await graph.invoke(
      baseState({
        nlQuery: 'Exclude 503 response codes',
        esqlQuery: 'FROM logs-* | WHERE response.code != 503 | STATS count = COUNT(*)',
      })
    );

    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    expect(finalState.esqlQuery).toBe(
      'FROM logs-* | WHERE response.code != 503 | STATS count = COUNT(*)'
    );
  });

  it('regenerates esql for edits and includes the existing query as context', async () => {
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | WHERE response.code != 503 | STATS count = COUNT(*)',
    } as Awaited<ReturnType<typeof generateEsql>>);
    mockGetColumns.mockResolvedValue([{ name: 'count', type: 'long' }]);

    const graph = await createVisualizationGraph(
      createMockModel() as never,
      logger,
      events,
      esClient
    );
    const parsedExistingConfig = {
      type: 'metric',
      metrics: [{ type: 'primary', column: 'count' }],
      data_source: {
        type: 'esql',
        query: COUNT_QUERY,
      },
    } as unknown as VisualizationConfig;

    const finalState = await graph.invoke(
      baseState({
        nlQuery: 'Exclude 503 response codes',
        existingConfig: JSON.stringify(parsedExistingConfig),
        parsedExistingConfig,
        esqlQuery: '',
      })
    );

    expect(mockedGenerateEsql).toHaveBeenCalledWith(
      expect.objectContaining({
        nlQuery: expect.stringContaining(`Existing esql query to modify: "${COUNT_QUERY}"`),
      })
    );
    expect(finalState.esqlQuery).toBe(
      'FROM logs-* | WHERE response.code != 503 | STATS count = COUNT(*)'
    );
  });

  it('finalizes with the esql error without compiling or invoking the author when esql generation fails', async () => {
    mockedGenerateEsql.mockResolvedValue({
      error: 'no such index [metrics-system.load]',
    } as Awaited<ReturnType<typeof generateEsql>>);

    const model = createMockModel();
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);

    const finalState = await graph.invoke(
      baseState({
        nlQuery: '5-minute load average',
        index: 'metrics-*',
        esqlQuery: '',
      })
    );

    expect(finalState.validatedConfig).toBeNull();
    expect(finalState.error).toBe(
      'Could not resolve a valid ES|QL query for the visualization: no such index [metrics-system.load]'
    );
    expect(mockGetColumns).not.toHaveBeenCalled();
    expect(model.defaultChat.invoke).not.toHaveBeenCalled();
  });

  it('authors a type outside the allow-list and pins the provided query', async () => {
    const model = createMockModel(
      asAuthoringResponse({
        type: 'metric',
        metrics: [{ type: 'primary', column: 'count' }],
      })
    );
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);

    const finalState = await graph.invoke(
      baseState({ compileAllowList: [] as SupportedChartType[] })
    );

    expect(model.defaultChat.invoke).toHaveBeenCalled();
    expect(finalState.error).toBeNull();
    expect(finalState.validatedConfig).toMatchObject({
      type: 'metric',
      data_source: { type: 'esql', query: COUNT_QUERY },
    });
  });

  it('fails a metric with a temporal dimension and does not invoke the author', async () => {
    mockGetColumns.mockResolvedValue([
      { name: 'count', type: 'long' },
      { name: '@timestamp', type: 'date' },
    ]);
    const model = createMockModel();
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);

    const finalState = await graph.invoke(
      baseState({
        esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY @timestamp',
      })
    );

    expect(model.defaultChat.invoke).not.toHaveBeenCalled();
    expect(finalState.validatedConfig).toBeNull();
    expect(finalState.error).toEqual(expect.stringContaining('unbucket the query or use xy'));
    expect(finalState.error).toEqual(expect.stringContaining('"count" (long, measure)'));
    expect(finalState.error).toEqual(expect.stringContaining('"@timestamp" (date, dimension)'));
  });

  it('resolves an ambiguous metric secondary with one low-effort fallback call', async () => {
    mockGetColumns.mockResolvedValue([
      { name: 'count', type: 'long' },
      { name: 'bytes', type: 'long' },
    ]);
    const model = createMockModel();
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);

    const finalState = await graph.invoke(
      baseState({
        esqlQuery: 'FROM logs-* | STATS count = COUNT(*), bytes = SUM(size)',
      })
    );

    expect(model.selectModel).toHaveBeenCalledTimes(1);
    expect(model.selectModel).toHaveBeenCalledWith({ effortLevel: 'low' });
    expect(model.fallbackChat.invoke).toHaveBeenCalledTimes(1);
    expect(model.defaultChat.invoke).not.toHaveBeenCalled();
    expect(finalState.validatedConfig).toMatchObject({
      type: 'metric',
      metrics: [
        { type: 'primary', column: 'count' },
        { type: 'secondary', column: 'bytes' },
      ],
    });
  });

  it('returns an explicit probe error and does not regenerate the query', async () => {
    mockGetColumns.mockRejectedValue(new Error('index_not_found_exception'));
    const model = createMockModel();
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);

    const finalState = await graph.invoke(baseState());

    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    expect(model.defaultChat.invoke).not.toHaveBeenCalled();
    expect(finalState.validatedConfig).toBeNull();
    expect(finalState.esqlQuery).toBe(COUNT_QUERY);
    expect(finalState.error).toBe(
      'Could not probe columns for the visualization query: index_not_found_exception'
    );
  });
});
