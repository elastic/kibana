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
    fields: [
      { path: 'foo', type: 'keyword' },
      { path: 'bar', type: 'text' },
    ],
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

describe('formatResource', () => {
  it('formats a resource with description and fields', () => {
    const result = formatResource({
      type: EsResourceType.index,
      name: 'my-index',
      description: 'My index description',
      fields: [
        { path: 'field1', type: 'keyword' },
        { path: 'field2', type: 'text' },
        { path: 'field3', type: 'long' },
      ],
    });
    expect(result).toEqual(
      '- my-index (index): My index description\n  fields: field1 [keyword], field2 [text], field3 [long]'
    );
  });

  it('omits description when not provided', () => {
    const result = formatResource({
      type: EsResourceType.dataStream,
      name: 'logs-nginx',
      fields: [
        { path: '@timestamp', type: 'date' },
        { path: 'message', type: 'text' },
      ],
    });
    expect(result).toEqual(
      '- logs-nginx (data_stream)\n  fields: @timestamp [date], message [text]'
    );
  });

  it('omits fields line when fields is empty', () => {
    const result = formatResource({
      type: EsResourceType.alias,
      name: 'my-alias',
      description: 'An alias',
      fields: [],
    });
    expect(result).toEqual('- my-alias (alias): An alias');
  });

  it('omits fields line when fields is undefined', () => {
    const result = formatResource({
      type: EsResourceType.alias,
      name: 'my-alias',
    });
    expect(result).toEqual('- my-alias (alias)');
  });

  it('truncates fields to 10 entries', () => {
    const fields = Array.from({ length: 15 }, (_, i) => ({
      path: `field${i + 1}`,
      type: 'keyword',
    }));
    const result = formatResource({
      type: EsResourceType.index,
      name: 'big-index',
      fields,
    });
    expect(result).toContain('fields: field1 [keyword],');
    expect(result).toContain('[and 5 more]');
    expect(result).not.toContain('field11');
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

  it('passes includeKibanaIndices as false when indexPattern is "*"', async () => {
    await indexExplorer({
      nlQuery: 'test query',
      indexPattern: '*',
      esClient,
      model,
    });

    expect(listSearchSourcesMock).toHaveBeenCalledWith({
      pattern: '*',
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
      excludeIndicesRepresentedAsDatastream: true,
      excludeIndicesRepresentedAsAlias: false,
      esClient,
      includeKibanaIndices: true,
    });
  });
});
