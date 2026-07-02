/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Escalation-ladder tests for the generate_config node, using the REAL chart
 * type registry (schemas + capability manifest) and a mocked model:
 * attempt 1 = capability index + core schema + examples, retries add repair
 * fragments for capabilities implicated by validation errors, and the final
 * attempt falls back to the full schema. Chart types without a manifest keep
 * the full-schema prompt on every attempt.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { MAX_RETRY_ATTEMPTS } from './actions_lens';
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

// Responses are consumed in order; the last one repeats for further attempts.
// The low-effort model backs the fulfillment check, which reports satisfied
// here so these tests exercise the escalation ladder only.
const createMockModelProvider = (responses: object[]) => {
  const invoke = jest.fn();
  for (const response of responses) {
    invoke.mockResolvedValueOnce(asJsonResponse(response));
  }
  invoke.mockResolvedValue(asJsonResponse(responses[responses.length - 1]));
  const scopedModel = { chatModel: { invoke, withStructuredOutput: jest.fn() } };
  const fulfillmentModel = {
    chatModel: {
      invoke: jest.fn(),
      withStructuredOutput: jest.fn(() => ({
        invoke: jest.fn().mockResolvedValue({ satisfied: true, unmet: [] }),
      })),
    },
  };
  const modelProvider = {
    getDefaultModel: jest.fn().mockResolvedValue(scopedModel),
    selectModel: jest.fn().mockResolvedValue(fulfillmentModel),
  };
  return { modelProvider, invoke };
};

const promptOfCall = (invoke: jest.Mock, call: number): BaseMessageLike[] =>
  invoke.mock.calls[call][0] as BaseMessageLike[];

const contentOf = (prompt: BaseMessageLike[], index: number): string =>
  (prompt[index] as [string, string])[1];

const countOccurrences = (text: string, needle: string): number => text.split(needle).length - 1;

const ESQL_QUERY =
  'FROM logs-* | STATS `Request count` = COUNT(*) BY `Over time` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';

// data_source is intentionally absent: the graph pins the validated ES|QL
// query into every layer before validation.
const validXyConfig = {
  type: 'xy',
  title: 'Request count over time',
  layers: [{ type: 'line', x: { column: 'Over time' }, y: [{ column: 'Request count' }] }],
};

// Fails validation on a legend-owned path (columns max is 5).
const invalidLegendConfig = {
  ...validXyConfig,
  legend: { placement: 'inside', columns: 99 },
};

describe('generate_config escalation ladder', () => {
  const logger = createMockLogger();
  const events = {} as ToolEventEmitter;
  const esClient = { asCurrentUser: {} } as IScopedClusterClient;

  const XY_FULL_SCHEMA_MARKER = 'FULL_XY_SCHEMA_MARKER';

  const invokeGraph = async (
    responses: object[],
    {
      chartType = SupportedChartType.XY,
      schemaMarker = XY_FULL_SCHEMA_MARKER,
    }: { chartType?: SupportedChartType; schemaMarker?: string } = {}
  ) => {
    const { modelProvider, invoke } = createMockModelProvider(responses);
    const graph = await createVisualizationGraph(
      modelProvider as never,
      logger,
      events,
      esClient,
      false
    );
    const finalState = await graph.invoke({
      nlQuery: 'Request count over time',
      index: 'logs-*',
      chartType,
      schema: { marker: schemaMarker },
      existingConfig: undefined,
      parsedExistingConfig: null,
      esqlQuery: ESQL_QUERY,
      currentAttempt: 0,
      actions: [],
      validatedConfig: null,
      error: null,
    });
    return { finalState, invoke };
  };

  it('attempt 1 for XY carries the capability index, core schema, and examples — not the full schema', async () => {
    const { finalState, invoke } = await invokeGraph([validXyConfig]);

    expect(invoke).toHaveBeenCalledTimes(1);
    const system = contentOf(promptOfCall(invoke, 0), 0);
    expect(system).toContain('<capability_index type="xy">');
    expect(system).toContain('layer_data — ');
    expect(system).toContain('<core_schema type="xy">');
    expect(system).toContain(
      '<example description="Line time-series with a breakdown per category">'
    );
    expect(system).not.toContain('<schema type="xy">');
    expect(system).not.toContain(XY_FULL_SCHEMA_MARKER);
    expect(system).not.toContain('<schema_fragment');
    // Examples are rendered without their system-owned data_source fields.
    expect(system).not.toContain('"data_source"');

    const human = contentOf(promptOfCall(invoke, 0), 1);
    expect(human).toContain(ESQL_QUERY);
    expect(human).toContain('<user_query>\nRequest count over time\n</user_query>');

    expect(finalState.validatedConfig).toBeTruthy();
    expect(finalState.error).toBeNull();
  });

  it('a validation failure on a capability-owned path adds exactly that fragment on retry', async () => {
    const { finalState, invoke } = await invokeGraph([invalidLegendConfig, validXyConfig]);

    expect(invoke).toHaveBeenCalledTimes(2);
    const retrySystem = contentOf(promptOfCall(invoke, 1), 0);
    expect(retrySystem).toContain('<schema_fragment capability="legend">');
    expect(countOccurrences(retrySystem, '<schema_fragment')).toBe(1);
    expect(retrySystem).toContain('<capability_index type="xy">');
    expect(retrySystem).not.toContain(XY_FULL_SCHEMA_MARKER);

    const retryHuman = contentOf(promptOfCall(invoke, 1), 1);
    expect(retryHuman).toContain('Previous attempts:');

    expect(finalState.validatedConfig).toBeTruthy();
  });

  it('falls back to the full schema on the final attempt', async () => {
    const { finalState, invoke } = await invokeGraph([invalidLegendConfig]);

    expect(invoke).toHaveBeenCalledTimes(MAX_RETRY_ATTEMPTS);
    for (let call = 1; call < MAX_RETRY_ATTEMPTS - 1; call++) {
      const system = contentOf(promptOfCall(invoke, call), 0);
      expect(system).toContain('<schema_fragment capability="legend">');
      expect(system).not.toContain(XY_FULL_SCHEMA_MARKER);
    }
    const finalSystem = contentOf(promptOfCall(invoke, MAX_RETRY_ATTEMPTS - 1), 0);
    expect(finalSystem).toContain('<schema type="xy">');
    expect(finalSystem).toContain(XY_FULL_SCHEMA_MARKER);
    expect(finalSystem).not.toContain('<capability_index');
    expect(finalSystem).not.toContain('<schema_fragment');

    expect(finalState.validatedConfig).toBeNull();
    expect(finalState.error).toBeTruthy();
  });

  it('keeps the full-schema prompt on every attempt for chart types without a manifest', async () => {
    const validMetricConfig = {
      type: 'metric',
      metrics: [{ type: 'primary', column: 'Request count' }],
    };
    const { finalState, invoke } = await invokeGraph([validMetricConfig], {
      chartType: SupportedChartType.Metric,
      schemaMarker: 'FULL_METRIC_SCHEMA_MARKER',
    });

    expect(invoke).toHaveBeenCalledTimes(1);
    const system = contentOf(promptOfCall(invoke, 0), 0);
    expect(system).toContain('<schema type="metric">');
    expect(system).toContain('FULL_METRIC_SCHEMA_MARKER');
    expect(system).not.toContain('<capability_index');
    expect(system).not.toContain('<core_schema');
    expect(system).not.toContain('<schema_fragment');
    expect(system).not.toContain('<example');

    expect(finalState.validatedConfig).toBeTruthy();
  });
});
