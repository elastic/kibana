/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createNlToEsqlGraph } from './graph';
import type { EsqlLoadedDocumentation } from './documentation';
import type { RequestDocumentationAction } from './actions';
import type { ResolvedResourceWithSampling } from '../utils/resources';

jest.mock('../utils/resources', () => ({
  ...jest.requireActual('../utils/resources'),
  resolveResourceForEsqlWithSamplingStats: jest.fn(),
}));

jest.mock('../utils/esql', () => ({
  ...jest.requireActual('../utils/esql'),
  validateEsqlQuery: jest.fn().mockResolvedValue(null),
  executeEsql: jest.fn(),
}));

import { resolveResourceForEsqlWithSamplingStats } from '../utils/resources';
import { executeEsql } from '../utils/esql';

const mockResolveResource = resolveResourceForEsqlWithSamplingStats as jest.MockedFn<
  typeof resolveResourceForEsqlWithSamplingStats
>;
const mockedExecuteEsql = jest.mocked(executeEsql);

const ESQL_QUERY = 'FROM logs-test | LIMIT 10';
const GENERATE_RESPONSE = `\`\`\`esql\n${ESQL_QUERY}\n\`\`\``;

const fakeResource: ResolvedResourceWithSampling = {
  name: 'logs-test',
  type: 'index' as any,
  fields: [],
  isTsdb: false,
};

const createMockModel = (generateResponse = GENERATE_RESPONSE) => {
  const docModelInvoke = jest.fn().mockResolvedValue({ commands: ['LIMIT'], functions: [] });
  const docRunnable = { withConfig: jest.fn(() => ({ invoke: docModelInvoke })) };

  const generateModelInvoke = jest.fn().mockResolvedValue({ content: generateResponse });
  const generateRunnable = { invoke: generateModelInvoke };

  const chatModel = {
    withStructuredOutput: jest.fn(() => docRunnable),
    withConfig: jest.fn(() => generateRunnable),
  };

  return { chatModel, docModelInvoke };
};

const createDocBase = () => ({ getDocumentation: jest.fn().mockReturnValue({}) });

const buildGraph = (
  chatModel: ReturnType<typeof createMockModel>['chatModel'],
  docBase = createDocBase()
) =>
  createNlToEsqlGraph({
    model: { chatModel } as unknown as ScopedModel,
    esClient: {} as ElasticsearchClient,
    docBase: docBase as any,
    documentation: {
      getDocContent: jest.fn().mockReturnValue(''),
    } as unknown as EsqlLoadedDocumentation,
    esqlCallbacks: {} as any,
  });

const BASE_INPUT = {
  nlQuery: 'count log lines',
  target: 'logs-test',
  execute: 'none' as const,
  maxRetries: 0,
  timeRange: { from: 'now-24h', to: 'now' },
  actions: [],
};

describe('createNlToEsqlGraph — requestDocumentation node', () => {
  beforeEach(() => {
    mockResolveResource.mockResolvedValue(fakeResource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('skips the in-graph LLM call when a precomputed RequestDocumentationAction is already in state.actions', async () => {
    const { chatModel, docModelInvoke } = createMockModel();
    const graph = buildGraph(chatModel);

    const precomputed: RequestDocumentationAction = {
      type: 'request_documentation',
      requestedKeywords: ['LIMIT'],
      fetchedDoc: { LIMIT: 'LIMIT syntax ...' },
    };

    await graph.invoke({ ...BASE_INPUT, actions: [precomputed] }, { recursionLimit: 25 });

    expect(docModelInvoke).not.toHaveBeenCalled();
  });

  it('invokes the LLM to select documentation when no precomputed action is in state.actions', async () => {
    const { chatModel, docModelInvoke } = createMockModel();
    const graph = buildGraph(chatModel);

    await graph.invoke({ ...BASE_INPUT, actions: [] }, { recursionLimit: 25 });

    expect(docModelInvoke).toHaveBeenCalledTimes(1);
  });

  it('fetches the PROMQL documentation when the query mentions PromQL, even if the LLM did not request it', async () => {
    const { chatModel } = createMockModel();
    const docBase = createDocBase();
    const graph = buildGraph(chatModel, docBase);

    await graph.invoke(
      { ...BASE_INPUT, nlQuery: 'cpu utilization using PromQL', actions: [] },
      { recursionLimit: 25 }
    );

    expect(docBase.getDocumentation).toHaveBeenCalledWith(['LIMIT', 'PROMQL']);
  });
});

describe('createNlToEsqlGraph — execute_query node', () => {
  beforeEach(() => {
    mockResolveResource.mockResolvedValue(fakeResource);
    mockedExecuteEsql.mockResolvedValue({ columns: [], values: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('none execute does not call executeEsql', async () => {
    const { chatModel } = createMockModel();
    const graph = buildGraph(chatModel);

    await graph.invoke(BASE_INPUT, { recursionLimit: 25 });

    expect(mockedExecuteEsql).not.toHaveBeenCalled();
  });

  it('data execute runs the query without a schema cap and returns rows', async () => {
    const { chatModel } = createMockModel();
    const graph = buildGraph(chatModel);
    const results = {
      columns: [{ name: 'count', type: 'long' as const }],
      values: [[42]],
    };
    mockedExecuteEsql.mockResolvedValue(results);

    const outState = await graph.invoke(
      { ...BASE_INPUT, execute: 'data', maxRetries: 1 },
      { recursionLimit: 25 }
    );

    const call = mockedExecuteEsql.mock.calls[0][0];
    expect(call.limit).toBeUndefined();
    expect(call.dropNullColumns).toBeUndefined();
    expect(outState.results).toEqual(results);
  });

  it('schema execute uses limit 1, keeps null columns, and returns the probe row', async () => {
    const { chatModel } = createMockModel();
    const graph = buildGraph(chatModel);
    mockedExecuteEsql.mockResolvedValue({
      columns: [{ name: 'count', type: 'long' }],
      values: [[42]],
    });

    const outState = await graph.invoke(
      { ...BASE_INPUT, execute: 'schema', maxRetries: 1 },
      { recursionLimit: 25 }
    );

    expect(mockedExecuteEsql).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1, dropNullColumns: false })
    );
    expect(mockedExecuteEsql.mock.calls[0][0].query).toContain('FROM logs-test');
    expect(mockedExecuteEsql.mock.calls[0][0].filter).toBeUndefined();
    expect(outState.results).toEqual({
      columns: [{ name: 'count', type: 'long' }],
      values: [[42]],
    });
  });

  const TS_QUERY = 'TS metrics-test | STATS SUM(RATE(requests))';
  const TS_RESPONSE = `\`\`\`esql\n${TS_QUERY}\n\`\`\``;

  it('schema execute bounds a TS query to the time range with a @timestamp filter', async () => {
    const { chatModel } = createMockModel(TS_RESPONSE);
    const graph = buildGraph(chatModel);

    await graph.invoke(
      {
        ...BASE_INPUT,
        execute: 'schema',
        maxRetries: 1,
        timeRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
      },
      { recursionLimit: 25 }
    );

    expect(mockedExecuteEsql.mock.calls[0][0].filter).toEqual({
      range: {
        '@timestamp': {
          gte: '2026-01-01T00:00:00.000Z',
          lte: '2026-01-02T00:00:00.000Z',
          format: 'strict_date_optional_time',
        },
      },
    });
  });

  it('data execute does not filter a TS query', async () => {
    const { chatModel } = createMockModel(TS_RESPONSE);
    const graph = buildGraph(chatModel);

    await graph.invoke({ ...BASE_INPUT, execute: 'data', maxRetries: 1 }, { recursionLimit: 25 });

    expect(mockedExecuteEsql.mock.calls[0][0].query).toContain('TS metrics-test');
    expect(mockedExecuteEsql.mock.calls[0][0].filter).toBeUndefined();
  });
});
