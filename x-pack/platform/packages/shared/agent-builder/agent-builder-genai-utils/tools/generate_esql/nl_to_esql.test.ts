/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

jest.mock('@kbn/inference-tracing', () => ({
  withActiveInferenceSpan: jest.fn((_name: string, _opts: unknown, fn: () => unknown) => fn()),
  ElasticGenAIAttributes: { InferenceSpanKind: 'InferenceSpanKind' },
}));

jest.mock('@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base', () => ({
  EsqlDocumentBase: { load: jest.fn() },
}));

jest.mock('@kbn/esql-server-utils', () => ({
  buildServerESQLCallbacks: jest.fn().mockReturnValue({}),
}));

jest.mock('./resolve_query_target', () => ({
  ...jest.requireActual('./resolve_query_target'),
  resolveQueryTarget: jest.fn(),
}));

jest.mock('./graph', () => ({
  createNlToEsqlGraph: jest.fn(),
  requestDocumentationSchema: {},
}));

jest.mock('../index_explorer', () => ({
  indexExplorer: jest.fn(),
}));

jest.mock('./documentation', () => ({
  loadDocumentation: jest.fn(),
  // EsqlDocEntry is imported by prompts.ts (not nl_to_esql.ts); the mock must export it
  // so that createRequestDocumentationPromptNoResource can call documentation.getDocContent(entry).
  EsqlDocEntry: {
    syntax: 'syntax',
    tsQueries: 'tsQueries',
    promqlQueries: 'promqlQueries',
    examples: 'examples',
  },
}));

import { EsqlDocumentBase } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base';
import { createNlToEsqlGraph } from './graph';
import { indexExplorer } from '../index_explorer';
import { loadDocumentation } from './documentation';
import { generateEsql, DEFAULT_EXECUTION_TIMEOUT_MS } from './nl_to_esql';
import { resolveQueryTarget } from './resolve_query_target';

const mockDocBase = { getDocumentation: jest.fn().mockReturnValue({}) };
const mockGraphOutput = {
  error: undefined,
  answer: 'FROM logs-test | LIMIT 10',
  query: 'FROM logs-test | LIMIT 10',
  results: undefined,
};

const createMockModel = () => {
  const docInvoke = jest.fn().mockResolvedValue({ commands: ['LIMIT'], functions: ['COUNT'] });
  const chatModel = {
    withStructuredOutput: jest.fn(() => ({ invoke: docInvoke })),
    withConfig: jest.fn(() => ({ invoke: jest.fn() })),
  };
  return { model: { chatModel } as unknown as ScopedModel, docInvoke };
};

describe('generateEsql — doc-prefetch orchestration', () => {
  let mockGraphInvoke: jest.Mock;

  beforeEach(() => {
    mockGraphInvoke = jest.fn().mockResolvedValue(mockGraphOutput);
    (EsqlDocumentBase.load as jest.Mock).mockResolvedValue(mockDocBase);
    (createNlToEsqlGraph as jest.Mock).mockReturnValue({ invoke: mockGraphInvoke });
    (indexExplorer as jest.Mock).mockResolvedValue({ resources: [{ name: 'logs-test' }] });
    (loadDocumentation as jest.Mock).mockResolvedValue({
      getDocContent: jest.fn().mockReturnValue(''),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('pre-fetches doc keywords and passes a RequestDocumentationAction to graph.invoke when no index is provided', async () => {
    const { model, docInvoke } = createMockModel();

    await generateEsql({
      nlQuery: 'count log lines',
      model,
      esClient: {} as ElasticsearchClient,
      logger: { debug: jest.fn() } as unknown as Logger,
    });

    expect(docInvoke).toHaveBeenCalledTimes(1);
    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: [expect.objectContaining({ type: 'request_documentation' })],
      }),
      expect.anything()
    );
  });

  it('skips the pre-fetch and passes an empty actions array to graph.invoke when an index is provided', async () => {
    const { model, docInvoke } = createMockModel();

    await generateEsql({
      nlQuery: 'count log lines',
      index: 'logs-test',
      model,
      esClient: {} as ElasticsearchClient,
      logger: { debug: jest.fn() } as unknown as Logger,
    });

    expect(docInvoke).not.toHaveBeenCalled();
    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.objectContaining({ actions: [] }),
      expect.anything()
    );
  });

  it('defaults execute to data and forwards schema and none', async () => {
    const { model } = createMockModel();
    const logger = { debug: jest.fn() } as unknown as Logger;
    const esClient = {} as ElasticsearchClient;
    const base = { nlQuery: 'count log lines', index: 'logs-test', model, esClient, logger };

    await generateEsql(base);
    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.objectContaining({ execute: 'data' }),
      expect.anything()
    );

    await generateEsql({ ...base, execute: 'none' });
    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.objectContaining({ execute: 'none' }),
      expect.anything()
    );

    await generateEsql({ ...base, execute: 'schema' });
    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.objectContaining({ execute: 'schema' }),
      expect.anything()
    );
  });

  it('bounds query execution to 30s by default and forwards an explicit executionTimeoutMs', async () => {
    const { model } = createMockModel();
    const logger = { debug: jest.fn() } as unknown as Logger;
    const esClient = {} as ElasticsearchClient;
    const base = { nlQuery: 'count log lines', index: 'logs-test', model, esClient, logger };

    await generateEsql(base);
    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.objectContaining({ executionTimeoutMs: DEFAULT_EXECUTION_TIMEOUT_MS }),
      expect.anything()
    );
    expect(DEFAULT_EXECUTION_TIMEOUT_MS).toBe(30_000);

    await generateEsql({ ...base, executionTimeoutMs: 5_000 });
    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.objectContaining({ executionTimeoutMs: 5_000 }),
      expect.anything()
    );
  });
});

describe('generateEsql — source from the current query', () => {
  let mockGraphInvoke: jest.Mock;

  const resource = { name: 'logs-*', type: 'index_pattern', fields: [] };

  beforeEach(() => {
    mockGraphInvoke = jest.fn().mockResolvedValue(mockGraphOutput);
    (EsqlDocumentBase.load as jest.Mock).mockResolvedValue(mockDocBase);
    (createNlToEsqlGraph as jest.Mock).mockReturnValue({ invoke: mockGraphInvoke });
    (indexExplorer as jest.Mock).mockResolvedValue({ resources: [{ name: 'logs-test' }] });
    (loadDocumentation as jest.Mock).mockResolvedValue({
      getDocContent: jest.fn().mockReturnValue(''),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const base = () => {
    const { model, docInvoke } = createMockModel();
    return {
      docInvoke,
      params: {
        nlQuery: 'add a sparkline of errors',
        model,
        esClient: {} as ElasticsearchClient,
        logger: { debug: jest.fn() } as unknown as Logger,
        execute: 'none' as const,
        sourceResolution: 'cascade' as const,
      },
    };
  };

  it('generates over the current sources, pinned, without the picker', async () => {
    (resolveQueryTarget as jest.Mock).mockResolvedValue({
      strategy: 'current_query',
      resource,
      sourceCommand: 'TS',
      projectRouting: '_alias:*',
    });
    const { params, docInvoke } = base();

    const result = await generateEsql({ ...params, currentQuery: 'TS logs-* | LIMIT 10' });

    expect(indexExplorer).not.toHaveBeenCalled();
    expect(docInvoke).not.toHaveBeenCalled();
    expect(createNlToEsqlGraph).toHaveBeenCalledWith(
      expect.objectContaining({ sourcePin: { sourceCommand: 'TS', projectRouting: '_alias:*' } })
    );
    const { resolveResource } = (createNlToEsqlGraph as jest.Mock).mock.calls[0][0];
    await expect(resolveResource('logs-*')).resolves.toBe(resource);
    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'logs-*', actions: [] }),
      expect.anything()
    );
    expect(result).toEqual(expect.objectContaining({ query: mockGraphOutput.query }));
  });

  it('does not pin the source command when the instruction asks for one', async () => {
    (resolveQueryTarget as jest.Mock).mockResolvedValue({
      strategy: 'current_query',
      resource,
      sourceCommand: 'FROM',
    });
    const { params } = base();

    await generateEsql({
      ...params,
      nlQuery: 'rewrite this with TS',
      currentQuery: 'FROM logs-*',
    });

    expect(createNlToEsqlGraph).toHaveBeenCalledWith(expect.objectContaining({ sourcePin: {} }));
  });

  it('falls back to the picker when the current query gives no source', async () => {
    (resolveQueryTarget as jest.Mock).mockResolvedValue(undefined);
    const { params, docInvoke } = base();

    await generateEsql({ ...params, currentQuery: 'ROW a = 1' });

    expect(indexExplorer).toHaveBeenCalledTimes(1);
    expect(docInvoke).toHaveBeenCalledTimes(1);
    expect(createNlToEsqlGraph).toHaveBeenCalledWith(
      expect.not.objectContaining({ sourcePin: expect.anything() })
    );
    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'logs-test' }),
      expect.anything()
    );
  });

  it('ignores the current query without the cascade, and when an index is given', async () => {
    const { params } = base();

    await generateEsql({ ...params, sourceResolution: undefined, currentQuery: 'FROM logs-*' });
    await generateEsql({ ...params, index: 'metrics-*', currentQuery: 'FROM logs-*' });

    expect(resolveQueryTarget).not.toHaveBeenCalled();
  });
});
