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
  EsqlDocEntry: { syntax: 'syntax', tsQueries: 'tsQueries', examples: 'examples' },
}));

import { EsqlDocumentBase } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base';
import { createNlToEsqlGraph } from './graph';
import { indexExplorer } from '../index_explorer';
import { loadDocumentation } from './documentation';
import { generateEsql } from './nl_to_esql';

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
});
