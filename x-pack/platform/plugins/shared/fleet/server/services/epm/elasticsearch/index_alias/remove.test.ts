/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { deleteIndexAliases } from './remove';

describe('deleteIndexAliases', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should remove alias links for the declared indices', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getAlias.mockResolvedValue({
      index1: { aliases: { alias1: {} } },
      index2: { aliases: { alias1: {} } },
    });

    await deleteIndexAliases(esClient, ['alias1']);

    expect(esClient.indices.deleteAlias).toHaveBeenCalledTimes(1);
    expect(esClient.indices.deleteAlias).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'alias1',
        index: ['index1', 'index2'],
      }),
      expect.anything()
    );
  });

  it('should remove only this packages alias links when alias is shared', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getAlias.mockResolvedValue({
      my_index: { aliases: { shared_alias: {} } },
      other_index: { aliases: { shared_alias: {} } },
    });

    await deleteIndexAliases(esClient, ['shared_alias'], {
      indicesToDelete: { shared_alias: ['my_index'] },
    });

    expect(esClient.indices.deleteAlias).toHaveBeenCalledTimes(1);
    expect(esClient.indices.deleteAlias).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'shared_alias',
        index: ['my_index'],
      }),
      expect.anything()
    );
  });

  it('should not attempt deletion when no alias is found', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getAlias.mockResolvedValue({});

    await deleteIndexAliases(esClient, ['alias1']);

    expect(esClient.indices.deleteAlias).not.toHaveBeenCalled();
  });
});
