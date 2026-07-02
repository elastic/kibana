/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fulfillment-check tests for the visualization graph, using the REAL chart
 * type registry (schemas + capability manifest) and mocked models: after a
 * successful validation on the capability-ladder path (XY), a low-effort model
 * call decides whether the config satisfies the request. Unmet asks trigger at
 * most one regeneration (with the matching schema fragments); if the config is
 * still unsatisfying, the run succeeds with non-fatal warnings. Chart types
 * without a capability manifest never run the check.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { createVisualizationGraph } from './graph_lens';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
}));

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const asJsonResponse = (config: object) => ({
  content: '```json\n' + JSON.stringify(config) + '\n```',
});

interface FulfillmentResult {
  satisfied: boolean;
  unmet: string[];
}

/**
 * Config responses feed the default model (config generation); fulfillment
 * results feed the low-effort model resolved via `selectModel`. Both are
 * consumed in order, the last one repeating for further calls.
 */
const createMockModelProvider = (
  configResponses: object[],
  fulfillmentResults: Array<FulfillmentResult | Error> = [{ satisfied: true, unmet: [] }]
) => {
  const configInvoke = jest.fn();
  for (const response of configResponses) {
    configInvoke.mockResolvedValueOnce(asJsonResponse(response));
  }
  configInvoke.mockResolvedValue(asJsonResponse(configResponses[configResponses.length - 1]));

  const fulfillmentInvoke = jest.fn();
  for (const result of fulfillmentResults) {
    if (result instanceof Error) {
      fulfillmentInvoke.mockRejectedValueOnce(result);
    } else {
      fulfillmentInvoke.mockResolvedValueOnce(result);
    }
  }
  const lastResult = fulfillmentResults[fulfillmentResults.length - 1];
  if (lastResult instanceof Error) {
    fulfillmentInvoke.mockRejectedValue(lastResult);
  } else {
    fulfillmentInvoke.mockResolvedValue(lastResult);
  }

  const scopedModel = { chatModel: { invoke: configInvoke, withStructuredOutput: jest.fn() } };
  const fulfillmentModel = {
    chatModel: {
      invoke: jest.fn(),
      withStructuredOutput: jest.fn(() => ({ invoke: fulfillmentInvoke })),
    },
  };
  const selectModel = jest.fn().mockResolvedValue(fulfillmentModel);
  const modelProvider = {
    getDefaultModel: jest.fn().mockResolvedValue(scopedModel),
    selectModel,
  };
  return { modelProvider, configInvoke, fulfillmentInvoke, selectModel };
};

const promptOfCall = (invoke: jest.Mock, call: number): BaseMessageLike[] =>
  invoke.mock.calls[call][0] as BaseMessageLike[];

const contentOf = (prompt: BaseMessageLike[], index: number): string =>
  (prompt[index] as [string, string])[1];

const ESQL_QUERY =
  'FROM logs-* | STATS `Request count` = COUNT(*) BY `Over time` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';

// data_source is intentionally absent: the graph pins the validated ES|QL
// query into every layer before validation.
const validXyConfig = {
  type: 'xy',
  title: 'Request count over time',
  layers: [{ type: 'line', x: { column: 'Over time' }, y: [{ column: 'Request count' }] }],
};

describe('fulfillment check', () => {
  const logger = createMockLogger();
  const events = {} as ToolEventEmitter;
  const esClient = { asCurrentUser: {} } as IScopedClusterClient;

  const invokeGraph = async (
    provider: ReturnType<typeof createMockModelProvider>,
    {
      chartType = SupportedChartType.XY,
      nlQuery = 'Request count over time with the legend on the right',
    }: { chartType?: SupportedChartType; nlQuery?: string } = {}
  ) => {
    const graph = await createVisualizationGraph(
      provider.modelProvider as never,
      logger,
      events,
      esClient,
      false
    );
    return graph.invoke({
      nlQuery,
      index: 'logs-*',
      chartType,
      schema: { marker: 'FULL_SCHEMA_MARKER' },
      existingConfig: undefined,
      parsedExistingConfig: null,
      esqlQuery: ESQL_QUERY,
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });
  };

  it('runs once on the XY ladder path with the low-effort model and does not regenerate when satisfied', async () => {
    const provider = createMockModelProvider([validXyConfig], [{ satisfied: true, unmet: [] }]);

    const finalState = await invokeGraph(provider);

    expect(provider.configInvoke).toHaveBeenCalledTimes(1);
    expect(provider.fulfillmentInvoke).toHaveBeenCalledTimes(1);
    expect(provider.selectModel).toHaveBeenCalledWith({ effortLevel: 'low' });

    // The check gets the user query, the capability index, and the validated config.
    const system = contentOf(promptOfCall(provider.fulfillmentInvoke, 0), 0);
    expect(system).toContain('<capability_index type="xy">');
    expect(system).toContain('legend — ');
    const human = contentOf(promptOfCall(provider.fulfillmentInvoke, 0), 1);
    expect(human).toContain('Request count over time with the legend on the right');
    expect(human).toContain('"type":"xy"');

    expect(finalState.validatedConfig).toBeTruthy();
    expect(finalState.error).toBeNull();
    expect(finalState.fulfillmentWarnings).toBeNull();
  });

  it('regenerates once on unmet asks, carrying their schema fragments and context', async () => {
    const provider = createMockModelProvider(
      [validXyConfig],
      [
        { satisfied: false, unmet: ['legend'] },
        { satisfied: true, unmet: [] },
      ]
    );

    const finalState = await invokeGraph(provider);

    expect(provider.configInvoke).toHaveBeenCalledTimes(2);
    expect(provider.fulfillmentInvoke).toHaveBeenCalledTimes(2);

    const retrySystem = contentOf(promptOfCall(provider.configInvoke, 1), 0);
    expect(retrySystem).toContain('<schema_fragment capability="legend">');
    const retryHuman = contentOf(promptOfCall(provider.configInvoke, 1), 1);
    expect(retryHuman).toContain('did not satisfy these requested features: legend');

    expect(finalState.validatedConfig).toBeTruthy();
    expect(finalState.error).toBeNull();
    expect(finalState.fulfillmentWarnings).toBeNull();
  });

  it('succeeds with warnings when the asks stay unmet after the single regeneration', async () => {
    const provider = createMockModelProvider(
      [validXyConfig],
      [{ satisfied: false, unmet: ['legend', 'a threshold line at 100'] }]
    );

    const finalState = await invokeGraph(provider);

    // One initial generation + exactly one fulfillment-triggered regeneration.
    expect(provider.configInvoke).toHaveBeenCalledTimes(2);
    expect(provider.fulfillmentInvoke).toHaveBeenCalledTimes(2);

    expect(finalState.validatedConfig).toBeTruthy();
    expect(finalState.error).toBeNull();
    expect(finalState.fulfillmentWarnings).toEqual(['legend', 'a threshold line at 100']);
  });

  it('never runs the check for chart types without a capability manifest', async () => {
    const validMetricConfig = {
      type: 'metric',
      metrics: [{ type: 'primary', column: 'Request count' }],
    };
    const provider = createMockModelProvider([validMetricConfig]);

    const finalState = await invokeGraph(provider, {
      chartType: SupportedChartType.Metric,
      nlQuery: 'Request count',
    });

    expect(provider.configInvoke).toHaveBeenCalledTimes(1);
    expect(provider.selectModel).not.toHaveBeenCalled();
    expect(provider.fulfillmentInvoke).not.toHaveBeenCalled();

    expect(finalState.validatedConfig).toBeTruthy();
    expect(finalState.fulfillmentWarnings).toBeNull();
  });

  it('fails open when the check model errors: no regeneration, no warnings', async () => {
    const provider = createMockModelProvider([validXyConfig], [new Error('model unavailable')]);

    const finalState = await invokeGraph(provider);

    expect(provider.configInvoke).toHaveBeenCalledTimes(1);
    expect(provider.fulfillmentInvoke).toHaveBeenCalledTimes(1);

    expect(finalState.validatedConfig).toBeTruthy();
    expect(finalState.error).toBeNull();
    expect(finalState.fulfillmentWarnings).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('model unavailable'));
  });
});
