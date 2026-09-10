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
}));

import { resolveResourceForEsqlWithSamplingStats } from '../utils/resources';

const mockResolveResource = resolveResourceForEsqlWithSamplingStats as jest.MockedFn<
  typeof resolveResourceForEsqlWithSamplingStats
>;

const ESQL_QUERY = 'FROM logs-test | LIMIT 10';
const GENERATE_RESPONSE = `\`\`\`esql\n${ESQL_QUERY}\n\`\`\``;

const fakeResource: ResolvedResourceWithSampling = {
  name: 'logs-test',
  type: 'index' as any,
  fields: [],
  isTsdb: false,
};

const createMockModel = () => {
  const docModelInvoke = jest.fn().mockResolvedValue({ commands: ['LIMIT'], functions: [] });
  const docRunnable = { withConfig: jest.fn(() => ({ invoke: docModelInvoke })) };

  const generateModelInvoke = jest.fn().mockResolvedValue({ content: GENERATE_RESPONSE });
  const generateRunnable = { invoke: generateModelInvoke };

  const chatModel = {
    withStructuredOutput: jest.fn(() => docRunnable),
    withConfig: jest.fn(() => generateRunnable),
  };

  return { chatModel, docModelInvoke };
};

const buildGraph = (chatModel: ReturnType<typeof createMockModel>['chatModel']) =>
  createNlToEsqlGraph({
    model: { chatModel } as unknown as ScopedModel,
    esClient: {} as ElasticsearchClient,
    docBase: { getDocumentation: jest.fn().mockReturnValue({}) } as any,
    documentation: {
      getDocContent: jest.fn().mockReturnValue(''),
    } as unknown as EsqlLoadedDocumentation,
    esqlCallbacks: {} as any,
  });

const BASE_INPUT = {
  nlQuery: 'count log lines',
  target: 'logs-test',
  executeQuery: false,
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
});
