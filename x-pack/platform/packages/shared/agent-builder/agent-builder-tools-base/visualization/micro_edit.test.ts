/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Micro-resolver tests (decisions §5), using the REAL chart type registry
 * (schemas + capability manifest) and mocked models: presentation edits are
 * resolved as a JSON merge patch validated against the full schema; data
 * edits, patches touching data-capability paths, and repeated validation
 * failures fall back to the full pipeline — which is proven to stay uninvoked
 * on the patch path through the buildVisualizationConfig routing tests.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { buildVisualizationConfig } from './build_visualization_config';
import { chartTypeRegistry } from './chart_type_registry';
import { createVisualizationGraph } from './graph_lens';
import { guessChartType } from './guess_chart_type';
import { tryMicroEdit } from './micro_edit';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
  validateEsqlQuery: jest.fn(),
}));

jest.mock('@kbn/esql-server-utils', () => ({
  buildServerESQLCallbacks: jest.fn(() => ({})),
}));

jest.mock('./graph_lens', () => ({
  createVisualizationGraph: jest.fn(),
}));

jest.mock('./guess_chart_type', () => ({
  guessChartType: jest.fn(),
}));

const mockedCreateGraph = jest.mocked(createVisualizationGraph);
const mockedGuessChartType = jest.mocked(guessChartType);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const asJsonResponse = (payload: object) => ({
  content: '```json\n' + JSON.stringify(payload) + '\n```',
});

/**
 * The low-effort model resolved via `selectModel` backs the micro-edit call;
 * responses are consumed in order, the last one repeating for further calls.
 */
const createMockModelProvider = (microResponses: object[]) => {
  const microInvoke = jest.fn();
  for (const response of microResponses) {
    microInvoke.mockResolvedValueOnce(asJsonResponse(response));
  }
  if (microResponses.length > 0) {
    microInvoke.mockResolvedValue(asJsonResponse(microResponses[microResponses.length - 1]));
  }
  const selectModel = jest.fn().mockResolvedValue({ chatModel: { invoke: microInvoke } });
  const modelProvider = {
    getDefaultModel: jest.fn().mockResolvedValue({ chatModel: { invoke: jest.fn() } }),
    selectModel,
  } as unknown as ModelProvider;
  return { modelProvider, microInvoke, selectModel };
};

const promptOfCall = (invoke: jest.Mock, call: number): BaseMessageLike[] =>
  invoke.mock.calls[call][0] as BaseMessageLike[];

const contentOf = (prompt: BaseMessageLike[], index: number): string =>
  (prompt[index] as [string, string])[1];

const ESQL_QUERY =
  'FROM logs-* | STATS `Request count` = COUNT(*) BY `Over time` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';

const existingXyConfig = {
  type: 'xy',
  title: 'Request count over time',
  layers: [
    {
      type: 'line',
      data_source: { type: 'esql', query: ESQL_QUERY },
      x: { column: 'Over time' },
      y: [{ column: 'Request count' }],
    },
  ],
  legend: { placement: 'outside', position: 'right' },
};

const xySchema = chartTypeRegistry[SupportedChartType.XY].schema;

describe('tryMicroEdit', () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
  });

  const runMicroEdit = (
    provider: ReturnType<typeof createMockModelProvider>,
    nlQuery = 'move the legend to the bottom'
  ) =>
    tryMicroEdit({
      nlQuery,
      chartType: SupportedChartType.XY,
      existingConfig: existingXyConfig,
      modelProvider: provider.modelProvider,
      logger,
    });

  it('applies a presentation patch via the low-effort model and validates against the full schema', async () => {
    const provider = createMockModelProvider([
      { intent: 'presentation', patch: { legend: { position: 'bottom' } } },
    ]);

    const result = await runMicroEdit(provider);

    expect(provider.selectModel).toHaveBeenCalledWith({ effortLevel: 'low' });
    expect(provider.microInvoke).toHaveBeenCalledTimes(1);

    // The prompt carries the kind-annotated capability index, the existing
    // config, and the edit instruction.
    const system = contentOf(promptOfCall(provider.microInvoke, 0), 0);
    expect(system).toContain('<capability_index type="xy">');
    expect(system).toContain('legend (presentation) — ');
    expect(system).toContain('layer_data (data) — ');
    const human = contentOf(promptOfCall(provider.microInvoke, 0), 1);
    expect(human).toContain(JSON.stringify(existingXyConfig));
    expect(human).toContain(
      '<edit_instruction>\nmove the legend to the bottom\n</edit_instruction>'
    );

    // Byte-identical to validating the existing config with only the legend changed.
    const expected = xySchema.validate({
      ...existingXyConfig,
      legend: { placement: 'outside', position: 'bottom' },
    });
    expect(result).toEqual({
      outcome: 'patched',
      validatedConfig: expected,
      esqlQuery: ESQL_QUERY,
    });
  });

  it('deletes keys via null patch values (RFC 7386 semantics)', async () => {
    const provider = createMockModelProvider([
      { intent: 'presentation', patch: { title: null, legend: null } },
    ]);

    const result = await runMicroEdit(provider, 'remove the title and the legend');

    expect(result.outcome).toBe('patched');
    if (result.outcome === 'patched') {
      const { title, legend, ...rest } = existingXyConfig;
      expect(result.validatedConfig).toEqual(xySchema.validate(rest));
    }
  });

  it("falls back on { intent: 'data' } without applying anything", async () => {
    const provider = createMockModelProvider([{ intent: 'data' }]);

    const result = await runMicroEdit(provider, 'show by host instead of service');

    expect(provider.microInvoke).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      outcome: 'fallback',
      reason: 'the model classified the edit as a data edit',
    });
  });

  it('falls back when the patch touches a data-capability path, even under a presentation intent', async () => {
    const provider = createMockModelProvider([
      {
        intent: 'presentation',
        patch: {
          layers: [{ type: 'line', x: { column: 'host.name' }, y: [{ column: 'Request count' }] }],
        },
      },
    ]);

    const result = await runMicroEdit(provider, 'show by host instead of service');

    expect(provider.microInvoke).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe('fallback');
    if (result.outcome === 'fallback') {
      expect(result.reason).toContain('layer_data');
    }
  });

  it('repairs an invalid patch once, carrying the validation error and the owning fragment', async () => {
    const provider = createMockModelProvider([
      // legend.columns max is 5 → validation failure on a legend-owned path.
      { intent: 'presentation', patch: { legend: { placement: 'inside', columns: 99 } } },
      { intent: 'presentation', patch: { legend: { position: 'bottom' } } },
    ]);

    const result = await runMicroEdit(provider);

    expect(provider.microInvoke).toHaveBeenCalledTimes(2);
    const repairHuman = contentOf(promptOfCall(provider.microInvoke, 1), 1);
    expect(repairHuman).toContain('<previous_patch>');
    expect(repairHuman).toContain('{"legend":{"placement":"inside","columns":99}}');
    expect(repairHuman).toContain('<error>');
    expect(repairHuman).toContain('<schema_fragment capability="legend">');

    const expected = xySchema.validate({
      ...existingXyConfig,
      legend: { placement: 'outside', position: 'bottom' },
    });
    expect(result).toEqual({
      outcome: 'patched',
      validatedConfig: expected,
      esqlQuery: ESQL_QUERY,
    });
  });

  it('falls back after the single repair retry also fails validation', async () => {
    const provider = createMockModelProvider([
      { intent: 'presentation', patch: { legend: { placement: 'inside', columns: 99 } } },
      { intent: 'presentation', patch: { legend: { placement: 'inside', columns: 42 } } },
    ]);

    const result = await runMicroEdit(provider);

    expect(provider.microInvoke).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe('fallback');
    if (result.outcome === 'fallback') {
      expect(result.reason).toContain('no valid presentation patch');
    }
  });

  it('re-pins data_source from the existing config and never mutates it', async () => {
    const provider = createMockModelProvider([
      { intent: 'presentation', patch: { legend: { position: 'bottom' } } },
    ]);
    const existingSnapshot = JSON.parse(JSON.stringify(existingXyConfig));

    const result = await runMicroEdit(provider);

    expect(result.outcome).toBe('patched');
    if (result.outcome === 'patched') {
      expect(result.validatedConfig.layers[0].data_source).toEqual({
        type: 'esql',
        query: ESQL_QUERY,
      });
      // No shared references: mutating the result cannot leak into the input.
      expect(result.validatedConfig.layers[0].data_source).not.toBe(
        existingXyConfig.layers[0].data_source
      );
    }
    expect(existingXyConfig).toEqual(existingSnapshot);
  });

  it('never returns a config with an altered query when the patch targets data_source directly', async () => {
    const provider = createMockModelProvider([
      // Root-level data_source is not part of the XY schema → validation
      // rejects it on both attempts and the micro path falls back.
      { intent: 'presentation', patch: { data_source: { type: 'esql', query: 'FROM evil' } } },
    ]);

    const result = await runMicroEdit(provider);

    expect(provider.microInvoke).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe('fallback');
  });

  it('falls back for chart types without a capability manifest before any model call', async () => {
    const provider = createMockModelProvider([]);

    const result = await tryMicroEdit({
      nlQuery: 'move the legend to the bottom',
      chartType: SupportedChartType.Metric,
      existingConfig: { type: 'metric' },
      modelProvider: provider.modelProvider,
      logger,
    });

    expect(provider.selectModel).not.toHaveBeenCalled();
    expect(result.outcome).toBe('fallback');
  });
});

describe('buildVisualizationConfig micro-edit routing', () => {
  const events = {} as ToolEventEmitter;
  const esClient = { asCurrentUser: {} } as IScopedClusterClient;

  let logger: Logger;
  let graphInvoke: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    mockedGuessChartType.mockResolvedValue(SupportedChartType.XY);
    graphInvoke = jest.fn().mockResolvedValue({
      validatedConfig: { type: 'xy', fromFullPipeline: true },
      error: null,
      currentAttempt: 1,
      esqlQuery: ESQL_QUERY,
      timeRange: null,
    });
    mockedCreateGraph.mockReturnValue({ invoke: graphInvoke } as unknown as ReturnType<
      typeof createVisualizationGraph
    >);
  });

  const run = (
    provider: ReturnType<typeof createMockModelProvider>,
    overrides: Partial<Parameters<typeof buildVisualizationConfig>[0]> = {}
  ) =>
    buildVisualizationConfig({
      nlQuery: 'move the legend to the bottom',
      existingConfig: JSON.stringify(existingXyConfig),
      parsedExistingConfig: existingXyConfig,
      modelProvider: provider.modelProvider,
      logger,
      events,
      esClient,
      ...overrides,
    });

  it('resolves a presentation edit on the micro path: the full graph is never created or invoked', async () => {
    const provider = createMockModelProvider([
      { intent: 'presentation', patch: { legend: { position: 'bottom' } } },
    ]);

    const result = await run(provider);

    expect(mockedCreateGraph).not.toHaveBeenCalled();
    expect(graphInvoke).not.toHaveBeenCalled();
    expect(mockedGuessChartType).not.toHaveBeenCalled();

    expect(result.selectedChartType).toBe(SupportedChartType.XY);
    expect(result.esqlQuery).toBe(ESQL_QUERY);
    expect(result.validatedConfig).toEqual(
      xySchema.validate({
        ...existingXyConfig,
        legend: { placement: 'outside', position: 'bottom' },
      })
    );
  });

  it('falls through to the full pipeline on data intent', async () => {
    const provider = createMockModelProvider([{ intent: 'data' }]);

    const result = await run(provider, { nlQuery: 'show by host instead of service' });

    expect(provider.microInvoke).toHaveBeenCalledTimes(1);
    expect(mockedCreateGraph).toHaveBeenCalledTimes(1);
    expect(graphInvoke).toHaveBeenCalledTimes(1);
    expect(graphInvoke.mock.calls[0][0]).toMatchObject({
      nlQuery: 'show by host instead of service',
      existingConfig: JSON.stringify(existingXyConfig),
    });
    expect(result.validatedConfig).toEqual({ type: 'xy', fromFullPipeline: true });
  });

  it('skips the micro path when there is no existing config', async () => {
    const provider = createMockModelProvider([]);

    await run(provider, {
      existingConfig: undefined,
      parsedExistingConfig: null,
      chartType: SupportedChartType.XY,
    });

    expect(provider.selectModel).not.toHaveBeenCalled();
    expect(graphInvoke).toHaveBeenCalledTimes(1);
  });

  it('skips the micro path when the caller requests a different chart type', async () => {
    const provider = createMockModelProvider([]);

    await run(provider, { chartType: SupportedChartType.Pie });

    expect(provider.selectModel).not.toHaveBeenCalled();
    expect(graphInvoke).toHaveBeenCalledTimes(1);
  });

  it('skips the micro path when an explicit ES|QL query is provided', async () => {
    const provider = createMockModelProvider([]);

    await run(provider, { esql: ESQL_QUERY, chartType: SupportedChartType.XY });

    expect(provider.selectModel).not.toHaveBeenCalled();
    expect(graphInvoke).toHaveBeenCalledTimes(1);
  });
});
