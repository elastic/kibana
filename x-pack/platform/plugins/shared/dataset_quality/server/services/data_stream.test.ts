/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { dataStreamService } from './data_stream';

describe('DataStreamService', () => {
  describe('getMatchingDataStreams', () => {
    it.each([403, 404])('returns no data streams for a %s response', async (statusCode) => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockRejectedValue({ statusCode });

      await expect(
        dataStreamService.getMatchingDataStreams(esClient, 'logs-*-*')
      ).resolves.toStrictEqual([]);
    });

    it('rethrows other errors', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      const error = { statusCode: 500 };
      esClient.indices.getDataStream.mockRejectedValue(error);

      await expect(dataStreamService.getMatchingDataStreams(esClient, 'logs-*-*')).rejects.toBe(
        error
      );
    });
  });
});
