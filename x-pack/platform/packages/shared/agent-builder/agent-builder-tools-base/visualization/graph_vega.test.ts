/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateEsql, executeEsql } from '@kbn/agent-builder-genai-utils';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { createVegaGraph } from './graph_vega';
import { validateVegaSpec } from './vega_validator';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
  executeEsql: jest.fn(),
  buildTimeRangeParams: jest.fn(() => [{ _tstart: 'now-24h' }, { _tend: 'now' }]),
}));

// The validator spawns a Vega worker thread; mock it so tests stay hermetic.
jest.mock('./vega_validator', () => ({
  validateVegaSpec: jest.fn(),
}));

const mockedGenerateEsql = jest.mocked(generateEsql);
const mockedExecuteEsql = jest.mocked(executeEsql);
const mockedValidateVegaSpec = jest.mocked(validateVegaSpec);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const invokeGraph = (
  model: unknown,
  input: { nlQuery: string; index?: string; esql?: string; existingSpec?: string }
) => {
  const graph = createVegaGraph(
    model as never,
    createMockLogger(),
    {} as ToolEventEmitter,
    { asCurrentUser: {} } as IScopedClusterClient
  );

  return graph.invoke({
    nlQuery: input.nlQuery,
    index: input.index,
    esql: input.esql,
    existingSpec: input.existingSpec,
    esqlQuery: input.esql ?? '',
    currentAttempt: 0,
    actions: [],
    validatedSpec: null,
    error: null,
  });
};

describe('createVegaGraph', () => {
  beforeEach(() => {
    mockedGenerateEsql.mockReset();
    mockedExecuteEsql.mockReset();
    mockedValidateVegaSpec.mockReset();
    mockedValidateVegaSpec.mockResolvedValue({ warnings: [] });
  });

  it('forces the raw-Vega schema and binds the ES|QL url onto the "source" data set', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [{ name: 'host', type: 'keyword' }],
      values: [],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    const generatedSpec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: [{ name: 'source' }],
      marks: [{ type: 'rect' }],
    };

    const model = {
      chatModel: {
        invoke: jest
          .fn()
          .mockResolvedValue({ content: `\`\`\`json\n${JSON.stringify(generatedSpec)}\n\`\`\`` }),
      },
    };

    const finalState = await invokeGraph(model, {
      nlQuery: 'bars per host',
      esql: 'FROM logs | STATS c = COUNT(*) BY host',
    });

    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    expect(finalState.validatedSpec).not.toBeNull();

    const spec = JSON.parse(finalState.validatedSpec as string);
    expect(spec.$schema).toBe('https://vega.github.io/schema/vega/v5.json');
    expect(Array.isArray(spec.data)).toBe(true);
    expect(spec.data[0]).toEqual({
      name: 'source',
      url: {
        '%type%': 'esql',
        '%context%': true,
        query: 'FROM logs | STATS c = COUNT(*) BY host',
      },
    });
  });

  it('reuses the existing spec query on edit instead of regenerating ES|QL', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [{ name: 'host', type: 'keyword' }],
      values: [['web-1']],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    const existingSpec = JSON.stringify({
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      data: [
        {
          name: 'source',
          url: {
            '%type%': 'esql',
            '%context%': true,
            query: 'FROM logs | STATS c = COUNT(*) BY host',
          },
        },
      ],
      marks: [{ type: 'rect' }],
    });

    const model = {
      chatModel: {
        invoke: jest.fn().mockResolvedValue({
          content:
            '```json\n{"data":[{"name":"source"}],"marks":[{"type":"rect"}],"legends":[{"fill":"color"}]}\n```',
        }),
      },
    };

    // No esql and no index supplied — mirrors the edit path schema.
    const finalState = await invokeGraph(model, { nlQuery: 'add a legend', existingSpec });

    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    expect(mockedExecuteEsql).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM logs | STATS c = COUNT(*) BY host' })
    );
    const spec = JSON.parse(finalState.validatedSpec as string);
    expect(spec.data[0].url.query).toBe('FROM logs | STATS c = COUNT(*) BY host');
  });

  it('generates ES|QL when none is provided', async () => {
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM metrics | STATS avg = AVG(cpu) BY host',
      results: { columns: [{ name: 'host', type: 'keyword' }], values: [] },
    } as unknown as Awaited<ReturnType<typeof generateEsql>>);

    const generatedSpec = {
      data: [{ name: 'source' }],
      marks: [{ type: 'symbol' }],
    };

    const model = {
      chatModel: {
        invoke: jest
          .fn()
          .mockResolvedValue({ content: `\`\`\`json\n${JSON.stringify(generatedSpec)}\n\`\`\`` }),
      },
    };

    const finalState = await invokeGraph(model, { nlQuery: 'small multiples of cpu per host' });

    expect(mockedGenerateEsql).toHaveBeenCalled();
    expect(finalState.esqlQuery).toBe('FROM metrics | STATS avg = AVG(cpu) BY host');
    expect(finalState.validatedSpec).not.toBeNull();
  });

  it('removes top-level sizing and escapes dotted field references', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [
        { name: 'geo.src', type: 'keyword' },
        { name: 'Count', type: 'long' },
      ],
      values: [],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    const generatedSpec = {
      width: 600,
      height: 400,
      data: [{ name: 'source' }],
      scales: [{ name: 'color', type: 'ordinal', domain: { data: 'source', field: 'geo.src' } }],
      marks: [{ type: 'rect', encode: { update: { fill: { field: 'geo.src' } } } }],
    };

    const model = {
      chatModel: {
        invoke: jest
          .fn()
          .mockResolvedValue({ content: `\`\`\`json\n${JSON.stringify(generatedSpec)}\n\`\`\`` }),
      },
    };

    const finalState = await invokeGraph(model, {
      nlQuery: 'requests per source country',
      esql: 'FROM logs | STATS `Count` = COUNT(*) BY geo.src',
    });

    const spec = JSON.parse(finalState.validatedSpec as string);
    expect(spec.width).toBeUndefined();
    expect(spec.height).toBeUndefined();
    expect(spec.scales[0].domain.field).toBe('geo\\.src');
    expect(spec.marks[0].encode.update.fill.field).toBe('geo\\.src');
  });

  it('binds the url onto "source" while preserving derived data sets', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [{ name: 'stack', type: 'keyword' }],
      values: [],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    const derived = {
      name: 'nodes',
      source: 'source',
      transform: [{ type: 'filter', expr: 'datum.stack == "stk1"' }],
    };
    const generatedSpec = {
      data: [{ name: 'source' }, derived],
      marks: [{ type: 'path', from: { data: 'nodes' } }],
    };

    const model = {
      chatModel: {
        invoke: jest
          .fn()
          .mockResolvedValue({ content: `\`\`\`json\n${JSON.stringify(generatedSpec)}\n\`\`\`` }),
      },
    };

    const finalState = await invokeGraph(model, {
      nlQuery: 'sankey',
      esql: 'FROM logs | STATS c = COUNT(*) BY stack',
    });

    const spec = JSON.parse(finalState.validatedSpec as string);
    expect(spec.data[0].url['%type%']).toBe('esql');
    expect(spec.data[1]).toEqual(derived);
  });

  it('retries when the generated spec has no marks, then succeeds', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [],
      values: [],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    const invoke = jest
      .fn()
      .mockResolvedValueOnce({
        content: '```json\n{"title":"no marks here","data":[{"name":"source"}]}\n```',
      })
      .mockResolvedValueOnce({
        content: '```json\n{"data":[{"name":"source"}],"marks":[{"type":"line"}]}\n```',
      });

    const finalState = await invokeGraph(
      { chatModel: { invoke } },
      { nlQuery: 'something custom', esql: 'FROM logs' }
    );

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(finalState.validatedSpec).not.toBeNull();
    expect(JSON.parse(finalState.validatedSpec as string).marks[0].type).toBe('line');
  });

  it('collapses fatal production-rule arrays on legend symbol size/strokeWidth', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [],
      values: [],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    // A conditional production-rule array on a legend symbol "size"/"strokeWidth"
    // throws at render time ("Unrecognized signal name: undefined"); it must be
    // collapsed to its unconditional value.
    const generatedSpec = {
      data: [{ name: 'source' }],
      scales: [{ name: 'color', type: 'ordinal', domain: ['a', 'b'], range: ['#111', '#222'] }],
      legends: [
        {
          fill: 'color',
          encode: {
            symbols: {
              update: {
                strokeWidth: [{ test: "datum.label === 'a'", value: 3 }, { value: 0 }],
                size: [{ test: "datum.label === 'a'", value: 200 }, { value: 50 }],
                stroke: [{ test: "datum.label === 'a'", value: '#111' }, { value: '#222' }],
              },
            },
          },
        },
      ],
      marks: [{ type: 'symbol' }],
    };

    const model = {
      chatModel: {
        invoke: jest
          .fn()
          .mockResolvedValue({ content: `\`\`\`json\n${JSON.stringify(generatedSpec)}\n\`\`\`` }),
      },
    };

    const finalState = await invokeGraph(model, {
      nlQuery: 'dual axis chart',
      esql: 'FROM logs',
    });

    expect(model.chatModel.invoke).toHaveBeenCalledTimes(1);
    const spec = JSON.parse(finalState.validatedSpec as string);
    const symbols = spec.legends[0].encode.symbols.update;
    // size/strokeWidth collapsed to their unconditional default value.
    expect(symbols.strokeWidth).toEqual({ value: 0 });
    expect(symbols.size).toEqual({ value: 50 });
    // stroke supports production rules in a legend, so it is left untouched.
    expect(Array.isArray(symbols.stroke)).toBe(true);
  });

  it('retries when the spec has no "source" data set, then succeeds', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [],
      values: [],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    const invoke = jest
      .fn()
      .mockResolvedValueOnce({
        content: '```json\n{"data":[{"name":"rawData"}],"marks":[{"type":"rect"}]}\n```',
      })
      .mockResolvedValueOnce({
        content: '```json\n{"data":[{"name":"source"}],"marks":[{"type":"rect"}]}\n```',
      });

    const finalState = await invokeGraph(
      { chatModel: { invoke } },
      { nlQuery: 'something custom', esql: 'FROM logs' }
    );

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(finalState.validatedSpec).not.toBeNull();
    expect(JSON.parse(finalState.validatedSpec as string).data[0].name).toBe('source');
  });

  it('retries when Vega rejects the spec at render time, then succeeds', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [{ name: 'v', type: 'long' }],
      values: [[1]],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    mockedValidateVegaSpec
      .mockResolvedValueOnce({ error: 'Unrecognized scale name: "colorLegend"', warnings: [] })
      .mockResolvedValueOnce({ warnings: [] });

    const invoke = jest.fn().mockResolvedValue({
      content: '```json\n{"data":[{"name":"source"}],"marks":[{"type":"rect"}]}\n```',
    });

    const finalState = await invokeGraph(
      { chatModel: { invoke } },
      { nlQuery: 'dual axis chart', esql: 'FROM logs' }
    );

    expect(mockedValidateVegaSpec).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(finalState.validatedSpec).not.toBeNull();
    // The validator receives the finalized spec plus the ES|QL result rows.
    expect(mockedValidateVegaSpec).toHaveBeenLastCalledWith(
      expect.objectContaining({ rows: [{ v: 1 }] })
    );
  });

  it('does not retry on Vega warnings (soft feedback only)', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [],
      values: [],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    mockedValidateVegaSpec.mockResolvedValue({
      warnings: ['Channel opacity should not be used with an unsorted discrete field.'],
    });

    const invoke = jest.fn().mockResolvedValue({
      content: '```json\n{"data":[{"name":"source"}],"marks":[{"type":"rect"}]}\n```',
    });

    const finalState = await invokeGraph(
      { chatModel: { invoke } },
      { nlQuery: 'something custom', esql: 'FROM logs' }
    );

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(finalState.validatedSpec).not.toBeNull();
  });
});
