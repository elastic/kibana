/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Mock } from 'vitest';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

vi.mock('@kbn/inference-tracing', () => ({
  withActiveInferenceSpan: vi.fn((_name: string, _opts: unknown, fn: () => unknown) => fn()),
  ElasticGenAIAttributes: { InferenceSpanKind: 'InferenceSpanKind' },
}));

vi.mock('@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base', () => ({
  EsqlDocumentBase: { load: vi.fn() },
}));

vi.mock('@kbn/esql-server-utils', () => ({
  buildServerESQLCallbacks: vi.fn().mockReturnValue({}),
}));

vi.mock('./graph', () => ({
  createNlToEsqlGraph: vi.fn(),
  requestDocumentationSchema: {},
}));

vi.mock('../index_explorer', () => ({
  indexExplorer: vi.fn(),
}));

vi.mock('./documentation', () => ({
  loadDocumentation: vi.fn(),
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

const mockDocBase = { getDocumentation: vi.fn().mockReturnValue({}) };
const mockGraphOutput = {
  error: undefined,
  answer: 'FROM logs-test | LIMIT 10',
  query: 'FROM logs-test | LIMIT 10',
  results: undefined,
};

const createMockModel = () => {
  const docInvoke = vi.fn().mockResolvedValue({ commands: ['LIMIT'], functions: ['COUNT'] });
  const chatModel = {
    withStructuredOutput: vi.fn(() => ({ invoke: docInvoke })),
    withConfig: vi.fn(() => ({ invoke: vi.fn() })),
  };
  return { model: { chatModel } as unknown as ScopedModel, docInvoke };
};

describe('generateEsql — doc-prefetch orchestration', () => {
  let mockGraphInvoke: Mock;

  beforeEach(() => {
    mockGraphInvoke = vi.fn().mockResolvedValue(mockGraphOutput);
    (EsqlDocumentBase.load as Mock).mockResolvedValue(mockDocBase);
    (createNlToEsqlGraph as Mock).mockReturnValue({ invoke: mockGraphInvoke });
    (indexExplorer as Mock).mockResolvedValue({ resources: [{ name: 'logs-test' }] });
    (loadDocumentation as Mock).mockResolvedValue({
      getDocContent: vi.fn().mockReturnValue(''),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('pre-fetches doc keywords and passes a RequestDocumentationAction to graph.invoke when no index is provided', async () => {
    const { model, docInvoke } = createMockModel();

    await generateEsql({
      nlQuery: 'count log lines',
      model,
      esClient: {} as ElasticsearchClient,
      logger: { debug: vi.fn() } as unknown as Logger,
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
      logger: { debug: vi.fn() } as unknown as Logger,
    });

    expect(docInvoke).not.toHaveBeenCalled();
    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.objectContaining({ actions: [] }),
      expect.anything()
    );
  });

  it('defaults execute to data and forwards schema and none', async () => {
    const { model } = createMockModel();
    const logger = { debug: vi.fn() } as unknown as Logger;
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
    const logger = { debug: vi.fn() } as unknown as Logger;
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
