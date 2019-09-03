/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { RepositoryReservedField } from '../indexer/schema';
import { AnyObject, EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { RepositorySearchClient } from './repository_search_client';

let repoSearchClient: RepositorySearchClient;
let esClient;

// Setup the entire RepositorySearchClient.
function initSearchClient() {
  const log: Logger = (sinon.stub() as any) as Logger;
  esClient = initEsClient();

  repoSearchClient = new RepositorySearchClient(esClient, log);
}

const mockSearchResults = [
  // 1. The first response is a valid RepositorySearchResult with 2 repos
  {
    took: 1,
    hits: {
      total: {
        value: 2,
      },
      hits: [
        {
          _source: {
            [RepositoryReservedField]: {
              uri: 'github.com/elastic/elasticsearch',
              url: 'https://github.com/elastic/elasticsearch.git',
              name: 'elasticsearch',
              org: 'elastic',
            },
          },
        },
        {
          _source: {
            [RepositoryReservedField]: {
              uri: 'github.com/elastic/kibana',
              url: 'https://github.com/elastic/kibana.git',
              name: 'kibana',
              org: 'elastic',
            },
          },
        },
      ],
    },
  },
  // 2. The second response is a valid RepositorySearchResult with 0 repos
  {
    took: 1,
    hits: {
      total: {
        value: 0,
      },
      hits: [],
    },
  },
  // 3. The third response is an invalid RepositorySearchResult with results
  // but without the RepositoryReservedField
  {
    took: 1,
    hits: {
      total: {
        value: 1,
      },
      hits: [
        {
          _source: {},
        },
      ],
    },
  },
];

// Setup the mock EsClient.
function initEsClient(): EsClient {
  esClient = {
    search: async (_: AnyObject): Promise<any> => {
      Promise.resolve({});
    },
  };
  const searchStub = sinon.stub(esClient, 'search');

  // Binding the mock search results to the stub.
  mockSearchResults.forEach((result, index) => {
    searchStub.onCall(index).returns(Promise.resolve(result));
  });

  return (esClient as any) as EsClient;
}

beforeEach(() => {
  initSearchClient();
});

test('Repository search', async () => {
  // 1. The first response should have 2 results.
  const responseWithResult = await repoSearchClient.search({ query: 'mockQuery', page: 1 });
  expect(responseWithResult.repositories.length).toEqual(2);
  expect(responseWithResult.total).toEqual(2);
  expect(responseWithResult.repositories[0]).toEqual({
    uri: 'github.com/elastic/elasticsearch',
    url: 'https://github.com/elastic/elasticsearch.git',
    name: 'elasticsearch',
    org: 'elastic',
  });
  expect(responseWithResult.repositories[1]).toEqual({
    uri: 'github.com/elastic/kibana',
    url: 'https://github.com/elastic/kibana.git',
    name: 'kibana',
    org: 'elastic',
  });

  // 2. The second response should have 0 result.
  const responseWithEmptyResult = await repoSearchClient.search({ query: 'mockQuery', page: 1 });
  expect(responseWithEmptyResult.repositories.length).toEqual(0);
  expect(responseWithEmptyResult.total).toEqual(0);

  // 3. The third response should have 1 hit, but 0 RepositorySearchResults, because the result
  // does not have the RepositoryReservedField.
  const responseWithInvalidResult = await repoSearchClient.search({ query: 'mockQuery', page: 1 });
  expect(responseWithInvalidResult.repositories.length).toEqual(0);
  expect(responseWithInvalidResult.total).toEqual(1);
});
