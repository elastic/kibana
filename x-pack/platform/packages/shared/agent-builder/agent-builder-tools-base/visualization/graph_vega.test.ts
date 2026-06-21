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

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
  executeEsql: jest.fn(),
}));

const mockedGenerateEsql = jest.mocked(generateEsql);
const mockedExecuteEsql = jest.mocked(executeEsql);

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
  });

  it('executes a provided ES|QL query and injects the canonical data url into the spec', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [{ name: 'host', type: 'keyword' }],
      values: [],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    const model = {
      chatModel: {
        invoke: jest
          .fn()
          .mockResolvedValue({ content: '```json\n{"mark":"bar","data":{"name":"bad"}}\n```' }),
      },
    };

    const finalState = await invokeGraph(model, {
      nlQuery: 'bars per host',
      esql: 'FROM logs | STATS c = COUNT(*) BY host',
    });

    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    expect(finalState.validatedSpec).not.toBeNull();

    const spec = JSON.parse(finalState.validatedSpec as string);
    expect(spec.$schema).toBe('https://vega.github.io/schema/vega-lite/v5.json');
    expect(spec.data).toEqual({
      url: {
        '%type%': 'esql',
        '%context%': true,
        query: 'FROM logs | STATS c = COUNT(*) BY host',
      },
    });
  });

  it('generates ES|QL when none is provided', async () => {
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM metrics | STATS avg = AVG(cpu) BY host',
      results: { columns: [{ name: 'host', type: 'keyword' }], values: [] },
    } as unknown as Awaited<ReturnType<typeof generateEsql>>);

    const model = {
      chatModel: {
        invoke: jest
          .fn()
          .mockResolvedValue({ content: '```json\n{"facet":{"field":"host"},"spec":{}}\n```' }),
      },
    };

    const finalState = await invokeGraph(model, { nlQuery: 'small multiples of cpu per host' });

    expect(mockedGenerateEsql).toHaveBeenCalled();
    expect(finalState.esqlQuery).toBe('FROM metrics | STATS avg = AVG(cpu) BY host');
    expect(finalState.validatedSpec).not.toBeNull();
  });

  it('normalizes fixed sizing to container and escapes dotted field references', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [
        { name: 'geo.src', type: 'keyword' },
        { name: 'Count', type: 'long' },
      ],
      values: [],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    const model = {
      chatModel: {
        invoke: jest.fn().mockResolvedValue({
          content:
            '```json\n{"width":"container","height":500,"layer":[{"mark":"bar","encoding":{"x":{"field":"geo.src"},"y":{"field":"Count"}}}]}\n```',
        }),
      },
    };

    const finalState = await invokeGraph(model, {
      nlQuery: 'requests per source country',
      esql: 'FROM logs | STATS `Count` = COUNT(*) BY geo.src',
    });

    const spec = JSON.parse(finalState.validatedSpec as string);
    expect(spec.width).toBe('container');
    expect(spec.height).toBe('container');
    expect(spec.layer[0].encoding.x.field).toBe('geo\\.src');
    expect(spec.layer[0].encoding.y.field).toBe('Count');
  });

  it('strips unsupported container sizing from composed (facet) specs', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [
        { name: 'Time', type: 'date' },
        { name: 'Count', type: 'long' },
      ],
      values: [],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    const facetSpec = {
      width: 'container',
      height: 'container',
      facet: { row: { field: 'Response Code', type: 'nominal' } },
      spec: { width: 'container', height: 80, mark: 'area', encoding: {} },
    };

    const model = {
      chatModel: {
        invoke: jest
          .fn()
          .mockResolvedValue({ content: `\`\`\`json\n${JSON.stringify(facetSpec)}\n\`\`\`` }),
      },
    };

    const finalState = await invokeGraph(model, {
      nlQuery: 'horizon chart by response code',
      esql: 'FROM logs | STATS Count = COUNT(*) BY Time = BUCKET(@timestamp, 3 hours), Response Code = response.keyword',
    });

    const spec = JSON.parse(finalState.validatedSpec as string);
    expect(spec.width).toBeUndefined();
    expect(spec.height).toBeUndefined();
    expect(spec.spec.width).toBeUndefined();
    expect(spec.spec.height).toBe(80);
  });

  it('retries when the generated spec has no rendering directive, then succeeds', async () => {
    mockedExecuteEsql.mockResolvedValue({
      columns: [],
      values: [],
    } as unknown as Awaited<ReturnType<typeof executeEsql>>);

    const invoke = jest
      .fn()
      .mockResolvedValueOnce({ content: '```json\n{"title":"no mark here"}\n```' })
      .mockResolvedValueOnce({ content: '```json\n{"mark":"line"}\n```' });

    const finalState = await invokeGraph(
      { chatModel: { invoke } },
      { nlQuery: 'something custom', esql: 'FROM logs' }
    );

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(finalState.validatedSpec).not.toBeNull();
    expect(JSON.parse(finalState.validatedSpec as string).mark).toBe('line');
  });
});
