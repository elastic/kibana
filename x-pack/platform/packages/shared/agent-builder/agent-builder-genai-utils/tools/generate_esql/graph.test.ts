/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createNlToEsqlGraph } from './graph';
import type { EsqlLoadedDocumentation } from './documentation';
import type { RequestDocumentationAction } from './actions';
import type { ResolvedResourceWithSampling } from '../utils/resources';

vi.mock('../utils/resources', async () => {
      const mocked = {
      ...(await vi.importActual('../utils/resources')),
      resolveResourceForEsqlWithSamplingStats: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../utils/esql', async () => {
      const mocked = {
      ...(await vi.importActual('../utils/esql')),
      validateEsqlQuery: vi.fn().mockResolvedValue(null),
      executeEsql: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

import { resolveResourceForEsqlWithSamplingStats } from '../utils/resources';
import { executeEsql } from '../utils/esql';

const mockResolveResource = resolveResourceForEsqlWithSamplingStats as MockedFunction<
  typeof resolveResourceForEsqlWithSamplingStats
>;
const mockedExecuteEsql = vi.mocked(executeEsql);

const ESQL_QUERY = 'FROM logs-test | LIMIT 10';
const GENERATE_RESPONSE = `\`\`\`esql\n${ESQL_QUERY}\n\`\`\``;

const fakeResource: ResolvedResourceWithSampling = {
  name: 'logs-test',
  type: 'index' as any,
  fields: [],
  isTsdb: false,
};

const createMockModel = () => {
  const docModelInvoke = vi.fn().mockResolvedValue({ commands: ['LIMIT'], functions: [] });
  const docRunnable = { withConfig: vi.fn(() => ({ invoke: docModelInvoke })) };

  const generateModelInvoke = vi.fn().mockResolvedValue({ content: GENERATE_RESPONSE });
  const generateRunnable = { invoke: generateModelInvoke };

  const chatModel = {
    withStructuredOutput: vi.fn(() => docRunnable),
    withConfig: vi.fn(() => generateRunnable),
  };

  return { chatModel, docModelInvoke };
};

const buildGraph = (chatModel: ReturnType<typeof createMockModel>['chatModel']) =>
  createNlToEsqlGraph({
    model: { chatModel } as unknown as ScopedModel,
    esClient: {} as ElasticsearchClient,
    docBase: { getDocumentation: vi.fn().mockReturnValue({}) } as any,
    documentation: {
      getDocContent: vi.fn().mockReturnValue(''),
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
    vi.clearAllMocks();
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
});

describe('createNlToEsqlGraph — execute_query node', () => {
  beforeEach(() => {
    mockResolveResource.mockResolvedValue(fakeResource);
    mockedExecuteEsql.mockResolvedValue({ columns: [], values: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
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
    expect(outState.results).toEqual({
      columns: [{ name: 'count', type: 'long' }],
      values: [[42]],
    });
  });
});
