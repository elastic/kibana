/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { generateEsql, executeEsql } from '@kbn/agent-builder-genai-utils';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { createEsqlResponseError } from '../shared/esql_response_error.mock';
import { createVisualizationGraph } from './graph_lens';
import type { VisualizationConfig } from './types';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
  executeEsql: jest.fn(),
  buildTimeRangeParams: jest.fn(() => undefined),
}));

jest.mock('./chart_type_registry', () => ({
  chartTypeRegistry: new Proxy(
    {},
    {
      get: () => ({
        schema: {
          parse: (config: unknown) => config,
        },
        prompt: {
          selection: 'Mock chart description',
        },
      }),
    }
  ),
}));

const mockedGenerateEsql = jest.mocked(generateEsql);
const mockedExecuteEsql = jest.mocked(executeEsql);

const EXECUTED_COLUMNS = [
  { name: 'count', type: 'long' as const },
  { name: 'status', type: 'keyword' as const },
];

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

describe('createVisualizationGraph', () => {
  const logger = createMockLogger();
  const events = {} as ToolEventEmitter;
  const esClient = { asCurrentUser: {} } as IScopedClusterClient;

  // Returns a ModelProvider-shaped mock. `createVisualizationGraph` resolves the default model
  // via `getDefaultModel()` for the config node; the ES|QL node resolves the
  // low-effort model via `selectModel()`. Both resolve to the same connector so the
  // default-model fallback in `generateVisualizationEsql` stays out of these tests.
  const createMockModel = (invokeResult: string = asAuthoringResponse({ type: 'metric' })) => {
    const scopedModel = {
      connector: { connectorId: 'default-connector' },
      chatModel: {
        // invoke resolves to a message-like object; graph_lens reads `.content` via
        // extractTextFromMessage.
        invoke: jest.fn().mockResolvedValue({ content: invokeResult }),
      },
    };
    return {
      getDefaultModel: jest.fn().mockResolvedValue(scopedModel),
      selectModel: jest.fn().mockResolvedValue(scopedModel),
    } as const;
  };

  beforeEach(() => {
    mockedGenerateEsql.mockReset();
    mockedExecuteEsql.mockReset();
    mockedExecuteEsql.mockResolvedValue({
      columns: EXECUTED_COLUMNS,
      values: [],
    } as Awaited<ReturnType<typeof executeEsql>>);
  });

  it('executes a provided esql query and binds its columns without generating a new one', async () => {
    const model = createMockModel();
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);
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
    expect(mockedExecuteEsql).toHaveBeenCalledWith(
      expect.objectContaining({ query: esqlQuery, dropNullColumns: false, limit: 1 })
    );
    expect(finalState.esqlQuery).toBe(esqlQuery);

    const prompt = JSON.stringify(
      (await model.getDefaultModel()).chatModel.invoke.mock.calls[0][0]
    );
    expect(prompt).toContain('- \\"count\\" (long)');
    expect(prompt).toContain('- \\"status\\" (keyword)');
    expect(prompt).not.toContain('No column information is available');
  });

  it('regenerates esql when the provided query fails to execute', async () => {
    mockedExecuteEsql.mockRejectedValueOnce(
      createEsqlResponseError('verification_exception', 'Unknown column [missing_field]')
    );
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | STATS count = COUNT(*)',
      results: { columns: EXECUTED_COLUMNS, values: [] },
    } as Awaited<ReturnType<typeof generateEsql>>);

    const graph = await createVisualizationGraph(
      createMockModel() as never,
      logger,
      events,
      esClient
    );

    const finalState = await graph.invoke({
      nlQuery: 'Count logs',
      index: 'logs-*',
      chartType: SupportedChartType.Metric,
      schema: {},
      existingConfig: undefined,
      parsedExistingConfig: null,
      esqlQuery: 'FROM logs-* | STATS broken = COUNT(*) BY missing_field',
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });

    expect(mockedGenerateEsql).toHaveBeenCalled();
    expect(finalState.esqlQuery).toBe('FROM logs-* | STATS count = COUNT(*)');
  });

  it('binds generateEsql result columns into the config prompt', async () => {
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | STATS count = COUNT(*) BY status',
      results: { columns: EXECUTED_COLUMNS, values: [] },
    } as Awaited<ReturnType<typeof generateEsql>>);

    const model = createMockModel();
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);

    await graph.invoke({
      nlQuery: 'Count logs by status',
      index: 'logs-*',
      chartType: SupportedChartType.Metric,
      schema: {},
      existingConfig: undefined,
      parsedExistingConfig: null,
      esqlQuery: '',
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });

    const prompt = JSON.stringify(
      (await model.getDefaultModel()).chatModel.invoke.mock.calls[0][0]
    );
    expect(prompt).toContain('- \\"count\\" (long)');
    expect(prompt).toContain('- \\"status\\" (keyword)');
    expect(prompt).toContain('Bind only these executed result columns, using their exact names');
  });

  it('returns the authoring note without storing it in the validated config', async () => {
    const authoringNote = 'Created a titleless metric showing the total log count.';
    const graph = await createVisualizationGraph(
      createMockModel(
        `\`\`\`json\n${JSON.stringify({
          authoring_note: authoringNote,
          config: { type: 'metric' },
        })}\n\`\`\``
      ) as never,
      logger,
      events,
      esClient
    );
    const esqlQuery = 'FROM logs-* | STATS count = COUNT(*)';

    const finalState = await graph.invoke({
      nlQuery: 'Count logs',
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

    expect(finalState.authoringNote).toBe(authoringNote);
    expect(finalState.validatedConfig).toEqual({
      type: 'metric',
      data_source: { type: 'esql', query: esqlQuery },
    });
  });

  it('accepts a valid config when the authoring note is missing', async () => {
    const graph = await createVisualizationGraph(
      createMockModel(
        `\`\`\`json\n${JSON.stringify({ config: { type: 'metric' } })}\n\`\`\``
      ) as never,
      logger,
      events,
      esClient
    );
    const esqlQuery = 'FROM logs-* | STATS count = COUNT(*)';

    const finalState = await graph.invoke({
      nlQuery: 'Count logs',
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

    expect(finalState.validatedConfig).toEqual({
      type: 'metric',
      data_source: { type: 'esql', query: esqlQuery },
    });
    expect(finalState.authoringNote).toBeNull();
  });

  it.each([false, true])('applyChartRules=%s edits regenerate ES|QL', async (applyChartRules) => {
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | WHERE response.code != 503 | STATS count = COUNT(*)',
    } as Awaited<ReturnType<typeof generateEsql>>);

    const model = createMockModel();
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);
    const parsedExistingConfig = {
      type: 'metric',
      data_source: {
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
      applyChartRules,
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
    const { chatModel } = await model.getDefaultModel();
    expect(chatModel.invoke).toHaveBeenCalledWith(
      expect.arrayContaining([['human', expect.stringContaining(finalState.esqlQuery)]])
    );
    expect(chatModel.invoke).toHaveBeenCalledWith(
      expect.arrayContaining([
        [
          'system',
          expect.stringContaining(
            applyChartRules
              ? 'Reauthor the presentation.'
              : 'preserve unrelated presentation settings'
          ),
        ],
      ])
    );
  });

  it('finalizes with the esql error without generating a config when esql generation fails', async () => {
    mockedGenerateEsql.mockResolvedValue({
      error: 'no such index [metrics-system.load]',
    } as Awaited<ReturnType<typeof generateEsql>>);

    const model = createMockModel();
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);

    const finalState = await graph.invoke({
      nlQuery: '5-minute load average',
      index: 'metrics-*',
      chartType: SupportedChartType.Metric,
      schema: {},
      existingConfig: undefined,
      parsedExistingConfig: null,
      esqlQuery: '',
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });

    expect(finalState.validatedConfig).toBeNull();
    expect(finalState.error).toBe(
      'Could not resolve a valid ES|QL query for the visualization: no such index [metrics-system.load]'
    );
    // Config generation must not run without a query: the prompt forbids the
    // model from emitting data_source, so validation could never succeed.
    expect((await model.getDefaultModel()).chatModel.invoke as jest.Mock).not.toHaveBeenCalled();
  });

  it('injects the validated esql query, overwriting any query emitted by the config LLM', async () => {
    const canonicalQuery = 'TS metrics-* | STATS avg = AVG(cpu) BY host';
    // The config LLM corrupts the query (TS -> FROM) in the data_source it emits.
    const corruptedConfig = asAuthoringResponse({
      type: 'metric',
      data_source: { type: 'esql', query: 'FROM metrics-* | STATS avg = AVG(cpu) BY host' },
    });

    const graph = await createVisualizationGraph(
      createMockModel(corruptedConfig) as never,
      logger,
      events,
      esClient
    );

    const finalState = await graph.invoke({
      nlQuery: 'Average cpu by host',
      index: 'metrics-*',
      chartType: SupportedChartType.Metric,
      schema: {},
      existingConfig: undefined,
      parsedExistingConfig: null,
      esqlQuery: canonicalQuery,
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });

    const validated = finalState.validatedConfig as {
      data_source?: { type: string; query: string };
    };
    expect(validated.data_source).toEqual({ type: 'esql', query: canonicalQuery });
  });

  it('injects data_source when the config LLM omits it (single-dataset config)', async () => {
    const canonicalQuery = 'FROM logs-* | STATS count = COUNT(*)';
    const configWithoutDataSource = asAuthoringResponse({ type: 'metric' });

    const graph = await createVisualizationGraph(
      createMockModel(configWithoutDataSource) as never,
      logger,
      events,
      esClient
    );

    const finalState = await graph.invoke({
      nlQuery: 'Count logs',
      index: 'logs-*',
      chartType: SupportedChartType.Metric,
      schema: {},
      existingConfig: undefined,
      parsedExistingConfig: null,
      esqlQuery: canonicalQuery,
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });

    const validated = finalState.validatedConfig as {
      data_source?: { type: string; query: string };
    };
    expect(validated.data_source).toEqual({ type: 'esql', query: canonicalQuery });
  });

  it('injects data_source into every layer when the config LLM omits it (XY multi-layer)', async () => {
    const canonicalQuery =
      'FROM logs-* | STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';
    const xyConfigWithoutDataSource = asAuthoringResponse({
      type: 'xy',
      layers: [{ type: 'series' }, { type: 'series' }],
    });

    const graph = await createVisualizationGraph(
      createMockModel(xyConfigWithoutDataSource) as never,
      logger,
      events,
      esClient
    );

    const finalState = await graph.invoke({
      nlQuery: 'Count logs over time',
      index: 'logs-*',
      chartType: SupportedChartType.XY,
      schema: {},
      existingConfig: undefined,
      parsedExistingConfig: null,
      esqlQuery: canonicalQuery,
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });

    const validated = finalState.validatedConfig as {
      layers?: Array<{ data_source?: { type: string; query: string } }>;
    };
    expect(validated.layers).toHaveLength(2);
    for (const layer of validated.layers ?? []) {
      expect(layer.data_source).toEqual({ type: 'esql', query: canonicalQuery });
    }
  });

  it.each([false, true])('applyChartRules=%s preserves layer queries', async (applyChartRules) => {
    const firstQuery = 'FROM logs-* | STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, 1h)';
    const secondQuery = 'FROM metrics-* | STATS cpu = AVG(cpu) BY bucket = BUCKET(@timestamp, 1h)';
    const parsedExistingConfig = {
      type: 'xy',
      layers: [
        { type: 'series', data_source: { type: 'esql', query: firstQuery } },
        { type: 'series', data_source: { type: 'esql', query: secondQuery } },
      ],
    } as unknown as VisualizationConfig;
    const restyledConfig = asAuthoringResponse({
      type: 'xy',
      legend: { position: 'bottom' },
      layers: [{ type: 'series' }, { type: 'series' }],
    });

    const model = createMockModel(restyledConfig);
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);

    const finalState = await graph.invoke({
      nlQuery: 'Move the legend below the plot',
      index: undefined,
      chartType: SupportedChartType.XY,
      schema: {},
      existingConfig: JSON.stringify(parsedExistingConfig),
      parsedExistingConfig,
      preserveESQL: true,
      applyChartRules,
      esqlQuery: firstQuery,
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });

    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    const validated = finalState.validatedConfig as {
      layers?: Array<{ data_source?: { type: string; query: string } }>;
    };
    expect(validated.layers?.map((layer) => layer.data_source?.query)).toEqual([
      firstQuery,
      secondQuery,
    ]);
    const { chatModel } = await model.getDefaultModel();
    expect(chatModel.invoke).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['human', expect.stringContaining(JSON.stringify(parsedExistingConfig))],
      ])
    );
  });

  it('authors an appearance-only edit without regenerating ES|QL when the probe fails', async () => {
    mockedExecuteEsql.mockRejectedValue(new Error('verification_exception'));
    mockedGenerateEsql.mockResolvedValue({
      error: 'verification_exception',
    } as Awaited<ReturnType<typeof generateEsql>>);

    const existingQuery = 'FROM logs-* | STATS count = COUNT(*)';
    const parsedExistingConfig = {
      type: 'metric',
      data_source: { type: 'esql', query: existingQuery },
      metrics: [{ type: 'primary', column: 'count' }],
    } as unknown as VisualizationConfig;

    const graph = await createVisualizationGraph(
      createMockModel(
        asAuthoringResponse({
          type: 'metric',
          title: 'Log count',
          metrics: [{ type: 'primary', column: 'count' }],
        })
      ) as never,
      logger,
      events,
      esClient
    );

    const finalState = await graph.invoke({
      nlQuery: 'Apply presentation defaults.',
      index: 'logs-*',
      chartType: SupportedChartType.Metric,
      schema: {},
      existingConfig: JSON.stringify(parsedExistingConfig),
      parsedExistingConfig,
      preserveESQL: true,
      esqlQuery: existingQuery,
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });

    expect(mockedExecuteEsql).toHaveBeenCalledWith(
      expect.objectContaining({ query: existingQuery, dropNullColumns: false, limit: 1 })
    );
    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    expect(finalState.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'resolve_esql',
          success: true,
          query: existingQuery,
        }),
      ])
    );
    expect(finalState.error).toBeNull();
    expect(finalState.validatedConfig).toEqual({
      type: 'metric',
      title: 'Log count',
      metrics: [{ type: 'primary', column: 'count' }],
      data_source: { type: 'esql', query: existingQuery },
    });
  });
});
