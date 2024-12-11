/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SearchService } from './search_service';
import { getIndicesForProductNames } from './utils';

import { performSearch } from './perform_search';
jest.mock('./perform_search');
const performSearchMock = performSearch as jest.MockedFn<typeof performSearch>;

describe('SearchService', () => {
  let logger: MockedLogger;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let service: SearchService;

  beforeEach(() => {
    logger = loggerMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    service = new SearchService({ logger, esClient });

    performSearchMock.mockResolvedValue([]);
  });

  afterEach(() => {
    performSearchMock.mockReset();
  });

  describe('#search', () => {
    it('calls `performSearch` with the right parameters', async () => {
      await service.search({
        query: 'What is Kibana?',
        products: ['kibana'],
        max: 42,
      });

      expect(performSearchMock).toHaveBeenCalledTimes(1);
      expect(performSearchMock).toHaveBeenCalledWith({
        searchQuery: 'What is Kibana?',
        size: 42,
        index: getIndicesForProductNames(['kibana']),
        client: esClient,
      });
    });
  });
});
