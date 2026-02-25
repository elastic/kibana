/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsResourceType } from '@kbn/agent-builder-common';
import type { ResourceDescriptor } from './index_explorer';
import { createIndexSelectorPrompt, formatResource, indexExplorer } from './index_explorer';
import { listSearchSources } from './steps/list_search_sources';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';

jest.mock('./steps/list_search_sources');

const listSearchSourcesMock = listSearchSources as jest.Mock;

describe('createIndexSelectorPrompt', () => {
  const nlQuery = 'some NL query';

  const indexDescriptor: ResourceDescriptor = {
    type: EsResourceType.index,
    name: 'some_index',
    description: 'some description',
    fields: ['foo', 'bar'],
  };

  it('returns a prompt containing the nl query', () => {
    const messages = createIndexSelectorPrompt({
      nlQuery,
      resources: [indexDescriptor],
    });

    const userPrompt = (messages[1] as string[])[1];

    expect(userPrompt).toContain(nlQuery);
  });

  it('returns a prompt containing the formatted resource', () => {
    const messages = createIndexSelectorPrompt({
      nlQuery,
      resources: [indexDescriptor],
    });

    const userPrompt = (messages[1] as string[])[1];

    expect(userPrompt).toContain(formatResource(indexDescriptor));
  });
});

describe('indexExplorer', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let model: ScopedModel;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    model = {
      chatModel: {
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockResolvedValue({
            targets: [],
          }),
        }),
      },
    } as unknown as ScopedModel;

    listSearchSourcesMock.mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [],
    });
  });

  it('passes includeKibanaIndices as false and does not include remote clusters when indexPattern is "*"', async () => {
    await indexExplorer({
      nlQuery: 'test query',
      indexPattern: '*',
      esClient,
      model,
    });

    // Default '*' pattern should only return local indices (no includeRemoteClusters)
    expect(listSearchSourcesMock).toHaveBeenCalledWith({
      pattern: '*',
      perTypeLimit: undefined,
      excludeIndicesRepresentedAsDatastream: true,
      excludeIndicesRepresentedAsAlias: false,
      esClient,
      includeKibanaIndices: false,
    });
  });

  it('passes includeKibanaIndices as true when indexPattern is not "*"', async () => {
    await indexExplorer({
      nlQuery: 'test query',
      indexPattern: 'logs-*',
      esClient,
      model,
    });

    expect(listSearchSourcesMock).toHaveBeenCalledWith({
      pattern: 'logs-*',
      perTypeLimit: undefined,
      excludeIndicesRepresentedAsDatastream: true,
      excludeIndicesRepresentedAsAlias: false,
      esClient,
      includeKibanaIndices: true,
    });
  });

  it('sets perTypeLimit to 50 when indexPattern contains ":" (CCS pattern)', async () => {
    await indexExplorer({
      nlQuery: 'test query',
      indexPattern: 'remote:logs-*',
      esClient,
      model,
    });

    // Explicit CCS pattern should increase perTypeLimit
    expect(listSearchSourcesMock).toHaveBeenCalledWith({
      pattern: 'remote:logs-*',
      perTypeLimit: 50,
      excludeIndicesRepresentedAsDatastream: true,
      excludeIndicesRepresentedAsAlias: false,
      esClient,
      includeKibanaIndices: true,
    });
  });
});
