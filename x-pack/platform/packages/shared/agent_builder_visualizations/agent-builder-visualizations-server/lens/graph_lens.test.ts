/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolMessage } from '@langchain/core/messages';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { createVisualizationGraph } from './graph_lens';
import { getFailingSchemaSections } from './schema_sections';
import type { VisualizationConfig } from './types';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
}));

const mockSchemaParse = jest.fn((config: unknown) => config);

jest.mock('./chart_type_registry', () => ({
  chartTypeRegistry: new Proxy(
    {},
    {
      get: () => ({
        schema: {
          parse: (config: unknown) => mockSchemaParse(config),
        },
        prompt: {
          selection: 'Mock chart description',
        },
      }),
    }
  ),
}));

// The registry mock has no real schemas, so the sections are faked as well.
jest.mock('./schema_sections', () => ({
  LOAD_SCHEMA_SECTIONS_TOOL_NAME: 'load_schema_sections',
  createLoadSchemaSectionsTool: () => ({ name: 'load_schema_sections' }),
  getSchemaSectionIndex: () => '- legend: position',
  filterSchemaSections: (_chartType: string, names: unknown[]) =>
    names.filter((name) => typeof name === 'string'),
  getFailingSchemaSections: jest.fn(() => []),
  renderSchemaSections: (_chartType: string, names: string[]) => `schema of ${names.join(', ')}`,
}));

const mockedGenerateEsql = jest.mocked(generateEsql);
const mockedGetFailingSchemaSections = jest.mocked(getFailingSchemaSections);

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
    const chatModel = {
      // invoke resolves to a message-like object; graph_lens reads `.content` via
      // extractTextFromMessage.
      invoke: jest.fn().mockResolvedValue({ content: invokeResult }),
      // Tool binding returns the same model so every call lands on `invoke`.
      bindTools: jest.fn<unknown, [tools: unknown[], options?: { tool_choice?: string }]>(
        (): unknown => chatModel
      ),
    };
    const scopedModel = {
      connector: { connectorId: 'default-connector' },
      chatModel,
    };
    return {
      getDefaultModel: jest.fn().mockResolvedValue(scopedModel),
      selectModel: jest.fn().mockResolvedValue(scopedModel),
    } as const;
  };

  beforeEach(() => {
    mockedGenerateEsql.mockReset();
    mockedGetFailingSchemaSections.mockReset().mockReturnValue([]);
  });

  it('uses the provided esql query without generating a new one', async () => {
    const graph = await createVisualizationGraph(
      createMockModel() as never,
      logger,
      events,
      esClient
    );
    const esqlQuery = 'FROM logs-* | WHERE response.code != 503 | STATS count = COUNT(*)';

    const finalState = await graph.invoke({
      nlQuery: 'Exclude 503 response codes',
      index: 'logs-*',
      chartType: SupportedChartType.Metric,
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

  it('passes the generated result columns to the config author', async () => {
    mockedGenerateEsql.mockResolvedValue({
      query:
        'FROM logs-* | STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      results: {
        columns: [
          { name: 'count', type: 'long' },
          { name: 'bucket', type: 'date' },
        ],
      },
    } as Awaited<ReturnType<typeof generateEsql>>);
    const model = createMockModel(asAuthoringResponse({ type: 'xy', layers: [{ type: 'line' }] }));
    const graph = await createVisualizationGraph(model as never, logger, events, esClient);

    await graph.invoke({
      nlQuery: 'Count logs over time',
      index: 'logs-*',
      chartType: SupportedChartType.XY,
      existingConfig: undefined,
      parsedExistingConfig: null,
      esqlQuery: '',
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });

    const { chatModel } = await model.getDefaultModel();
    const [[prompt]] = chatModel.invoke.mock.calls;
    expect(prompt).toContainEqual([
      'human',
      expect.stringContaining('Result columns: "count" (long), "bucket" (date)'),
    ]);
    expect(prompt).toContainEqual([
      'system',
      expect.stringContaining('Time series: a date column'),
    ]);
  });

  describe('schema sections', () => {
    const esqlQuery = 'FROM logs-* | STATS count = COUNT(*)';
    const toolCallResponse = {
      content: '',
      tool_calls: [{ id: 'call-1', name: 'load_schema_sections', args: { sections: ['legend'] } }],
    };

    const runGraph = async (model: ReturnType<typeof createMockModel>) => {
      const graph = await createVisualizationGraph(model as never, logger, events, esClient);
      return graph.invoke({
        nlQuery: 'Show the total log count',
        index: 'logs-*',
        chartType: SupportedChartType.Metric,
        existingConfig: undefined,
        parsedExistingConfig: null,
        esqlQuery,
        currentAttempt: 0,
        actions: [],
        validatedConfig: null,
        error: null,
      });
    };

    const getToolChoices = (bindTools: jest.Mock): Array<string | undefined> =>
      bindTools.mock.calls.map(
        ([, options]: [unknown, { tool_choice?: string } | undefined]) => options?.tool_choice
      );

    it('answers the tool call with the sections, then asks for the config with tools disabled', async () => {
      const model = createMockModel();
      const { chatModel } = await model.getDefaultModel();
      chatModel.invoke.mockResolvedValueOnce(toolCallResponse);

      const finalState = await runGraph(model);

      expect(chatModel.invoke).toHaveBeenCalledTimes(2);
      const [[firstPrompt], [secondPrompt]] = chatModel.invoke.mock.calls;
      expect(secondPrompt).toEqual([...firstPrompt, toolCallResponse, expect.any(ToolMessage)]);
      const toolMessage = secondPrompt[secondPrompt.length - 1] as ToolMessage;
      expect(toolMessage.tool_call_id).toBe('call-1');
      expect(toolMessage.content).toBe('schema of legend');
      expect(getToolChoices(chatModel.bindTools)).toEqual(expect.arrayContaining(['auto', 'none']));
      expect(finalState.loadedSchemaSections).toEqual(['legend']);
      expect(finalState.validatedConfig).toEqual({
        type: 'metric',
        data_source: { type: 'esql', query: esqlQuery },
      });
    });

    it('replays the loaded sections on a retry without offering the tool again', async () => {
      const model = createMockModel();
      const { chatModel } = await model.getDefaultModel();
      chatModel.invoke
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce({ content: 'not json at all' });

      await runGraph(model);

      expect(chatModel.invoke).toHaveBeenCalledTimes(3);
      const [, [secondPrompt], [retryPrompt]] = chatModel.invoke.mock.calls;
      expect(retryPrompt).toEqual([
        ...secondPrompt,
        ['ai', 'not json at all'],
        ['human', expect.stringMatching(/JSON/)],
      ]);
      expect(
        getToolChoices(chatModel.bindTools).filter((choice) => choice === 'auto')
      ).toHaveLength(1);
    });

    it('shows the schema of the failing sections with the validation error', async () => {
      const model = createMockModel();
      const { chatModel } = await model.getDefaultModel();
      mockSchemaParse.mockImplementationOnce(() => {
        throw new Error('metrics: Invalid input');
      });
      mockedGetFailingSchemaSections.mockReturnValueOnce(['metrics']);

      await runGraph(model);

      const [, [retryPrompt]] = chatModel.invoke.mock.calls;
      expect(retryPrompt[retryPrompt.length - 1]).toEqual([
        'human',
        expect.stringContaining(
          'Schema of the failing config sections:\n```json\nschema of metrics'
        ),
      ]);
    });
  });

  describe('retries', () => {
    const esqlQuery = 'FROM logs-* | STATS count = COUNT(*)';

    const runGraph = async (model: ReturnType<typeof createMockModel>) => {
      const graph = await createVisualizationGraph(model as never, logger, events, esClient);
      return graph.invoke({
        nlQuery: 'Show the total log count',
        index: 'logs-*',
        chartType: SupportedChartType.Metric,
        existingConfig: undefined,
        parsedExistingConfig: null,
        esqlQuery,
        currentAttempt: 0,
        actions: [],
        validatedConfig: null,
        error: null,
      });
    };

    it('replays the failed response and its validation error so the model can repair it', async () => {
      const failedResponse = asAuthoringResponse({ type: 'metric', metrics: 'count' });
      const repairedResponse = asAuthoringResponse({
        type: 'metric',
        metrics: [{ column: 'count' }],
      });
      const model = createMockModel();
      const { chatModel } = await model.getDefaultModel();
      chatModel.invoke
        .mockResolvedValueOnce({ content: failedResponse })
        .mockResolvedValueOnce({ content: repairedResponse });
      mockSchemaParse.mockImplementationOnce(() => {
        throw new Error('metrics: Expected array, received string');
      });

      const finalState = await runGraph(model);

      expect(chatModel.invoke).toHaveBeenCalledTimes(2);
      const [[firstPrompt], [retryPrompt]] = chatModel.invoke.mock.calls;
      // The original prompt is unchanged; the failed attempt is appended as a conversation.
      // The replayed response is the raw model output, so it has no injected data_source.
      expect(retryPrompt).toEqual([
        ...firstPrompt,
        ['ai', failedResponse],
        ['human', expect.stringContaining('metrics: Expected array, received string')],
      ]);
      expect(finalState.error).toBeNull();
      expect(finalState.validatedConfig).toEqual({
        type: 'metric',
        metrics: [{ column: 'count' }],
        data_source: { type: 'esql', query: esqlQuery },
      });
    });

    it('replays an unparsable response so the model can repair it', async () => {
      const model = createMockModel();
      const { chatModel } = await model.getDefaultModel();
      chatModel.invoke.mockResolvedValueOnce({ content: 'not json at all' });

      const finalState = await runGraph(model);

      expect(chatModel.invoke).toHaveBeenCalledTimes(2);
      const [, [retryPrompt]] = chatModel.invoke.mock.calls;
      expect(retryPrompt.slice(-2)).toEqual([
        ['ai', 'not json at all'],
        ['human', expect.stringMatching(/JSON/)],
      ]);
      expect(finalState.error).toBeNull();
    });

    it('does not replay an attempt whose model call failed', async () => {
      const model = createMockModel();
      const { chatModel } = await model.getDefaultModel();
      chatModel.invoke.mockRejectedValueOnce(new Error('connector timeout'));

      const finalState = await runGraph(model);

      expect(chatModel.invoke).toHaveBeenCalledTimes(2);
      const [[firstPrompt], [retryPrompt]] = chatModel.invoke.mock.calls;
      expect(retryPrompt).toEqual(firstPrompt);
      expect(finalState.error).toBeNull();
    });

    it('gives up after the retry budget and reports the generation error', async () => {
      const model = createMockModel('still not json');
      const { chatModel } = await model.getDefaultModel();

      const finalState = await runGraph(model);

      expect(chatModel.invoke).toHaveBeenCalledTimes(3);
      expect(finalState.validatedConfig).toBeNull();
      expect(finalState.error).toMatch(/JSON/);
    });
  });
});
