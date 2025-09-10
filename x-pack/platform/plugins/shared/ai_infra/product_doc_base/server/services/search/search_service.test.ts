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
import { defaultInferenceEndpoints } from '@kbn/inference-common';
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
    it('calls `performSearch` with the right default parameters', async () => {
      await service.search({
        query: 'What is Kibana?',
        products: ['kibana'],
        max: 42,
        highlights: 3,
      });

      expect(performSearchMock).toHaveBeenCalledTimes(1);
      expect(performSearchMock).toHaveBeenCalledWith({
        searchQuery: 'What is Kibana?',
        size: 42,
        highlights: 3,
        index: getIndicesForProductNames(['kibana'], undefined),
        client: esClient,
      });
    });
    it('calls `performSearch` with the right default index name for ELSER inference', async () => {
      await service.search({
        query: 'What is Kibana?',
        products: ['kibana'],
        max: 42,
        highlights: 3,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(performSearchMock).toHaveBeenCalledTimes(1);
      expect(performSearchMock).toHaveBeenCalledWith({
        searchQuery: 'What is Kibana?',
        size: 42,
        highlights: 3,
        index: [`.kibana_ai_product_doc_kibana`],
        client: esClient,
      });
    });

    it('calls `performSearch` with the right default index name for ELSER EIS inference ID', async () => {
      await service.search({
        query: 'What is Kibana?',
        products: ['kibana'],
        max: 42,
        highlights: 3,
        inferenceId: defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
      });

      expect(performSearchMock).toHaveBeenCalledTimes(1);
      expect(performSearchMock).toHaveBeenCalledWith({
        searchQuery: 'What is Kibana?',
        size: 42,
        highlights: 3,
        index: [`.kibana_ai_product_doc_kibana`],
        client: esClient,
      });
    });
    it('reroutes `performSearch` to multilingual index when inference ID is E5 small', async () => {
      await service.search({
        query: 'What is Kibana?',
        products: ['kibana'],
        max: 42,
        highlights: 3,
        inferenceId: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
      });

      expect(performSearchMock).toHaveBeenCalledTimes(1);
      expect(performSearchMock).toHaveBeenCalledWith({
        searchQuery: 'What is Kibana?',
        size: 42,
        highlights: 3,
        index: [`.kibana_ai_product_doc_kibana-${defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL}`],
        client: esClient,
      });
    });
  });
});
