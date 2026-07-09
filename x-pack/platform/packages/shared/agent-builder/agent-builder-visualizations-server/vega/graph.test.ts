/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { generateEsql, executeEsql } from '@kbn/agent-builder-genai-utils';
import { VEGA_LITE_SCHEMA } from './normalize_spec';
import { validateVegaSpec } from './vega_validator';
import { createVegaGraph } from './graph';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
  executeEsql: jest.fn(),
}));

jest.mock('./vega_validator', () => ({
  validateVegaSpec: jest.fn(),
}));

jest.mock('@kbn/agent-builder-genai-utils/tools/utils/esql', () => ({
  buildTimeRangeParams: jest.fn(() => undefined),
}));

jest.mock('../utils/extract_text_from_message', () => ({
  extractTextFromMessage: (message: unknown) => String(message),
}));

jest.mock('../shared/esql_instructions', () => ({
  esqlAdditionalInstructions: 'esql-instructions',
}));

const mockedGenerateEsql = jest.mocked(generateEsql);
const mockedExecuteEsql = jest.mocked(executeEsql);
const mockedValidateVegaSpec = jest.mocked(validateVegaSpec);

const createMockLogger = (): Logger =>
  ({ debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as Logger);

const asCodeBlock = (spec: object) => '```json\n' + JSON.stringify(spec) + '\n```';

const GENERATED_ESQL = 'FROM logs-* | STATS count = COUNT() BY status';
const PROVIDED_ESQL = 'FROM metrics-* | STATS avg = AVG(value) BY host';

describe('createVegaGraph', () => {
  const events = {} as ToolEventEmitter;
  const esClient = { asCurrentUser: {} } as IScopedClusterClient;

  let logger: Logger;
  let invoke: jest.Mock;
  /** Structured-output selector used by the reference-example selection node. */
  let selectInvoke: jest.Mock;
  let withStructuredOutput: jest.Mock;
  let modelProvider: ModelProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    invoke = jest.fn();
    // Default: the model selects no reference example, so authoring proceeds
    // without a REFERENCE EXAMPLES block. Individual tests override this.
    selectInvoke = jest.fn().mockResolvedValue({ exampleIds: [] });
    withStructuredOutput = jest.fn(() => ({ invoke: selectInvoke }));
    modelProvider = {
      getDefaultModel: jest.fn().mockResolvedValue({
        chatModel: { invoke, withStructuredOutput },
      }),
    } as unknown as ModelProvider;
    mockedGenerateEsql.mockResolvedValue({ query: GENERATED_ESQL } as Awaited<
      ReturnType<typeof generateEsql>
    >);
    mockedExecuteEsql.mockResolvedValue({ columns: [], values: [] } as Awaited<
      ReturnType<typeof executeEsql>
    >);
    mockedValidateVegaSpec.mockResolvedValue({ warnings: [] });
  });

  const run = async (
    input: { esqlQuery?: string; existingSpec?: string; existingEsql?: string } = {}
  ) => {
    const graph = await createVegaGraph(modelProvider, logger, events, esClient);
    return graph.invoke({
      nlQuery: 'small multiples of latency by region',
      index: undefined,
      existingSpec: input.existingSpec,
      existingEsql: input.existingEsql,
      esqlQuery: input.esqlQuery ?? '',
      currentAttempt: 0,
      actions: [],
      spec: null,
      error: null,
    });
  };

  it('generates ES|QL then authors and normalizes a spec', async () => {
    invoke.mockResolvedValue(asCodeBlock({ mark: 'bar', encoding: { x: { field: 'status' } } }));

    const state = await run();

    expect(mockedGenerateEsql).toHaveBeenCalledTimes(1);
    expect(state.error).toBeNull();
    const spec = JSON.parse(state.spec!);
    expect(spec.$schema).toBe(VEGA_LITE_SCHEMA);
    expect(spec.data).toEqual({
      url: { '%type%': 'esql', '%context%': true, query: GENERATED_ESQL },
    });
    expect(spec.mark).toBe('bar');
    expect(state.esqlQuery).toBe(GENERATED_ESQL);
  });

  it('injects the model-selected reference example into the authoring prompt', async () => {
    // The selection node picks an example; its structural block must reach the
    // author prompt (bodies loaded only for the selected id).
    selectInvoke.mockResolvedValue({ exampleIds: ['scatter_bubble'] });
    invoke.mockResolvedValue(asCodeBlock({ mark: 'point' }));

    await run();

    const authorPrompt = JSON.stringify(invoke.mock.calls[0][0]);
    expect(authorPrompt).toContain('REFERENCE EXAMPLES');
    expect(authorPrompt).toContain('Scatter / bubble plot (encoded size)');
  });

  it('selects reference examples once and reuses them across authoring retries', async () => {
    selectInvoke.mockResolvedValue({ exampleIds: ['heatmap'] });
    invoke
      .mockResolvedValueOnce('not json at all')
      .mockResolvedValueOnce(asCodeBlock({ mark: 'rect' }));

    await run();

    // Two authoring attempts, but selection ran exactly once before the loop.
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(selectInvoke).toHaveBeenCalledTimes(1);
  });

  it('does not author a spec when ES|QL resolution fails, despite selecting examples in parallel', async () => {
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-*',
      error: 'verification_exception: boom',
    } as Awaited<ReturnType<typeof generateEsql>>);

    await run();

    expect(selectInvoke).toHaveBeenCalledTimes(1);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('authors without a reference block when selection returns none', async () => {
    invoke.mockResolvedValue(asCodeBlock({ mark: 'bar' }));

    await run();

    expect(JSON.stringify(invoke.mock.calls[0][0])).not.toContain('REFERENCE EXAMPLES');
  });

  it('seeds ES|QL generation with the existing query as context when editing', async () => {
    invoke.mockResolvedValue(asCodeBlock({ mark: 'bar' }));

    // An edit with no trusted query: the recovered query must be handed to the
    // generator as context so a data-shape change (e.g. a new breakdown) can
    // actually modify the query instead of being stuck with the original one.
    const state = await run({ existingEsql: PROVIDED_ESQL });

    expect(mockedGenerateEsql).toHaveBeenCalledTimes(1);
    const { nlQuery } = mockedGenerateEsql.mock.calls[0][0];
    expect(nlQuery).toContain(PROVIDED_ESQL);
    expect(nlQuery).toContain('small multiples of latency by region');
    // The (possibly modified) generated query is what ends up in the spec.
    expect(JSON.parse(state.spec!).data.url.query).toBe(GENERATED_ESQL);
  });

  it('does not add edit context when there is no existing query to modify', async () => {
    invoke.mockResolvedValue(asCodeBlock({ mark: 'bar' }));

    await run();

    const { nlQuery } = mockedGenerateEsql.mock.calls[0][0];
    expect(nlQuery).not.toContain('Existing esql query to modify');
  });

  it('prefers a trusted provided query over the edit context', async () => {
    invoke.mockResolvedValue(asCodeBlock({ mark: 'point' }));

    // A caller-provided query that executes wins; generation (and its edit
    // context) is skipped entirely.
    const state = await run({ esqlQuery: PROVIDED_ESQL, existingEsql: GENERATED_ESQL });

    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    expect(JSON.parse(state.spec!).data.url.query).toBe(PROVIDED_ESQL);
  });

  it('executes a provided ES|QL query instead of generating one', async () => {
    invoke.mockResolvedValue(asCodeBlock({ mark: 'point' }));

    const state = await run({ esqlQuery: PROVIDED_ESQL });

    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    expect(mockedExecuteEsql).toHaveBeenCalledWith(
      expect.objectContaining({ query: PROVIDED_ESQL })
    );
    const spec = JSON.parse(state.spec!);
    expect(spec.data.url.query).toBe(PROVIDED_ESQL);
  });

  it('escapes dotted field references produced by the model', async () => {
    invoke.mockResolvedValue(asCodeBlock({ mark: 'bar', encoding: { x: { field: 'host.name' } } }));

    const state = await run({ esqlQuery: PROVIDED_ESQL });

    const spec = JSON.parse(state.spec!);
    expect(spec.encoding.x.field).toBe('host\\.name');
  });

  it('retries authoring after malformed output and then succeeds', async () => {
    invoke
      .mockResolvedValueOnce('not json at all')
      .mockResolvedValueOnce(asCodeBlock({ mark: 'line' }));

    const state = await run({ esqlQuery: PROVIDED_ESQL });

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(state.error).toBeNull();
    expect(JSON.parse(state.spec!).mark).toBe('line');
  });

  it('rejects an authored spec with no renderable view and retries', async () => {
    invoke
      .mockResolvedValueOnce(asCodeBlock({ title: 'no mark here' }))
      .mockResolvedValueOnce(asCodeBlock({ mark: 'arc' }));

    const state = await run({ esqlQuery: PROVIDED_ESQL });

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(state.error).toBeNull();
    expect(JSON.parse(state.spec!).mark).toBe('arc');
  });

  it('retries authoring when the spec fails to compile/render, then succeeds', async () => {
    invoke
      .mockResolvedValueOnce(asCodeBlock({ mark: 'bar', encoding: { x: { field: 'nope' } } }))
      .mockResolvedValueOnce(asCodeBlock({ mark: 'line' }));
    mockedValidateVegaSpec
      .mockResolvedValueOnce({ error: 'Unrecognized encoding channel', warnings: [] })
      .mockResolvedValueOnce({ warnings: [] });

    const state = await run({ esqlQuery: PROVIDED_ESQL });

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(state.error).toBeNull();
    expect(JSON.parse(state.spec!).mark).toBe('line');
  });

  it('feeds the render error into the next authoring attempt', async () => {
    invoke
      .mockResolvedValueOnce(asCodeBlock({ mark: 'bar' }))
      .mockResolvedValueOnce(asCodeBlock({ mark: 'line' }));
    mockedValidateVegaSpec
      .mockResolvedValueOnce({ error: 'Unknown transform op: bogus', warnings: [] })
      .mockResolvedValueOnce({ warnings: [] });

    await run({ esqlQuery: PROVIDED_ESQL });

    const secondPrompt = JSON.stringify(invoke.mock.calls[1][0]);
    expect(secondPrompt).toContain('Unknown transform op: bogus');
  });

  it('gives up when the spec never renders within the retry budget', async () => {
    invoke.mockResolvedValue(asCodeBlock({ mark: 'bar' }));
    mockedValidateVegaSpec.mockResolvedValue({ error: 'Infinite extent', warnings: [] });

    const state = await run({ esqlQuery: PROVIDED_ESQL });

    expect(state.spec).toBeNull();
    expect(state.error).toContain('Infinite extent');
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  it('regenerates a corrected query when the provided ES|QL fails to execute', async () => {
    invoke.mockResolvedValue(asCodeBlock({ mark: 'bar' }));
    // The provided query throws (an invalid, agent-invented query); the
    // regenerated query then executes cleanly.
    mockedExecuteEsql
      .mockRejectedValueOnce(
        new Error('verification_exception: second argument of [half_ms * 1ms] must be [numeric]')
      )
      .mockResolvedValue({ columns: [], values: [] } as Awaited<ReturnType<typeof executeEsql>>);

    const state = await run({ esqlQuery: PROVIDED_ESQL });

    // A bad provided query is routed through the self-correcting generator
    // instead of aborting, so we still produce a working chart.
    expect(mockedGenerateEsql).toHaveBeenCalledTimes(1);
    expect(state.error).toBeNull();
    expect(JSON.parse(state.spec!).data.url.query).toBe(GENERATED_ESQL);
  });

  it('aborts only after both the provided query and regeneration fail to execute', async () => {
    mockedExecuteEsql.mockRejectedValue(
      new Error('verification_exception: second argument of [half_ms * 1ms] must be [numeric]')
    );

    const state = await run({ esqlQuery: PROVIDED_ESQL });

    // The provided query is discarded and regeneration is attempted; when that
    // also cannot execute, we abort instead of authoring around a broken query.
    expect(mockedGenerateEsql).toHaveBeenCalledTimes(1);
    expect(invoke).not.toHaveBeenCalled();
    expect(state.spec).toBeNull();
    expect(state.error).toContain('Could not resolve a valid ES|QL query');
    expect(state.error).toContain('verification_exception');
  });

  it('aborts when generateEsql exhausts its retries and returns an error', async () => {
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | EVAL x = half_ms * 1 millisecond',
      error: 'verification_exception: second argument of [half_ms * 1ms] must be [numeric]',
    } as Awaited<ReturnType<typeof generateEsql>>);

    const state = await run();

    // A query that generateEsql itself could not validate must not be authored.
    expect(invoke).not.toHaveBeenCalled();
    expect(state.spec).toBeNull();
    expect(state.error).toContain('Could not resolve a valid ES|QL query');
    expect(state.error).toContain('verification_exception');
  });

  it('gives up after the retry budget and reports an error', async () => {
    invoke.mockResolvedValue('still not json');

    const state = await run({ esqlQuery: PROVIDED_ESQL });

    expect(state.spec).toBeNull();
    expect(state.error).toEqual(expect.any(String));
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  describe('render warnings', () => {
    it('hands every warning to the agent for one review pass, then finalizes its result', async () => {
      invoke
        .mockResolvedValueOnce(asCodeBlock({ mark: 'text', encoding: { x2: { value: 1 } } }))
        .mockResolvedValueOnce(asCodeBlock({ mark: 'text', encoding: { x: { value: 1 } } }));
      mockedValidateVegaSpec
        .mockResolvedValueOnce({
          warnings: [
            'x2 dropped as it is incompatible with "text".',
            'Infinite extent for field "count": [Infinity, -Infinity]',
          ],
        })
        .mockResolvedValueOnce({ warnings: [] });

      const state = await run({ esqlQuery: PROVIDED_ESQL });

      expect(invoke).toHaveBeenCalledTimes(2);
      expect(state.error).toBeNull();
      // Every warning — not a pre-filtered subset — is fed back, and the model is
      // told to judge each one for itself.
      const secondPrompt = JSON.stringify(invoke.mock.calls[1][0]);
      expect(secondPrompt).toContain('x2 dropped as it is incompatible');
      expect(secondPrompt).toContain('Infinite extent for field');
      expect(secondPrompt).toContain('decide for yourself');
    });

    it('makes a single review pass and accepts the spec when the agent keeps its warnings', async () => {
      // The model returns the same warning-bearing spec every time (it judged the
      // warnings harmless / unavoidable). We must not loop the whole budget.
      invoke.mockResolvedValue(asCodeBlock({ mark: 'text', encoding: { x2: { value: 1 } } }));
      mockedValidateVegaSpec.mockResolvedValue({
        warnings: ['Infinite extent for field "count": [Infinity, -Infinity]'],
      });

      const state = await run({ esqlQuery: PROVIDED_ESQL });

      // One initial authoring pass + one warning-review pass, then we accept.
      expect(invoke).toHaveBeenCalledTimes(2);
      expect(state.error).toBeNull();
      expect(state.spec).not.toBeNull();
    });
  });
});
