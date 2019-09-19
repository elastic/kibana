/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { AnyObject, EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { CommitSearchClient } from './commit_search_client';

let commitSearchClient: CommitSearchClient;
let esClient;

// Setup the entire RepositorySearchClient.
function initSearchClient() {
  const log: Logger = (sinon.stub() as any) as Logger;
  esClient = initEsClient();

  commitSearchClient = new CommitSearchClient(esClient, log);
}

const mockSearchResults = [
  // 1. The first response is a valid CommitSearchResult with 2 docs
  {
    took: 1,
    hits: {
      total: {
        value: 2,
      },
      hits: [
        {
          _source: {
            repoUri: 'github.com/Microsoft/TypeScript-Node-Starter',
            id: '018200a626125b197573fc4d2af840af102d6ecc',
            message:
              'Merge pull request #200 from peterblazejewicz/update/deps\n\nUpdate project dependencies',
            body: 'Update project dependencies',
            date: '2019-06-23T02:16:29.000Z',
            parents: [
              'c37be997b176292953629959e038ae88074bbfba',
              'ccf6ad89a643c321f43ec6063efa86f5a0b8a234',
            ],
            author: {
              name: 'Orta',
              email: 'ortam@microsoft.com',
            },
            committer: {
              name: 'GitHub',
              email: 'noreply@github.com',
            },
          },
        },
        {
          _source: {
            repoUri: 'github.com/Microsoft/TypeScript-Node-Starter',
            id: 'fc4c2b2d25d51c543dc7134c12f8a825ea8d6230',
            message:
              'Merge pull request #88 from peterblazejewicz/feat/update-shelljs\n\nUpdate ShellJS version',
            body: 'Update ShellJS version',
            date: '2018-02-27T01:09:07.000Z',
            parents: [
              'd15b403884879c505ef7c18a2f7785f4e6e67a52',
              'd0403de6cfcfa5d2477cf38baad71db15e70965c',
            ],
            author: {
              name: 'Bowden Kelly',
              email: 'wilkelly@microsoft.com',
            },
            committer: {
              name: 'GitHub',
              email: 'noreply@github.com',
            },
          },
        },
      ],
    },
    aggregations: {
      repoUri: {
        buckets: [
          {
            'github.com/Microsoft/TypeScript-Node-Starter': 2,
          },
        ],
      },
    },
  },
  // 2. The second response is a valid CommitSearchResult with 0 doc
  {
    took: 1,
    hits: {
      total: {
        value: 0,
      },
      hits: [],
    },
    aggregations: {
      repoUri: {
        buckets: [],
      },
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

test('Commit search', async () => {
  // 1. The first response should have 2 commits.
  const responseWithResult = await commitSearchClient.search({ query: 'string', page: 1 });
  expect(responseWithResult).toEqual(
    expect.objectContaining({
      total: 2,
      totalPage: 1,
      page: 1,
      query: 'string',
      commits: [
        {
          repoUri: 'github.com/Microsoft/TypeScript-Node-Starter',
          id: '018200a626125b197573fc4d2af840af102d6ecc',
          message:
            'Merge pull request #200 from peterblazejewicz/update/deps\n\nUpdate project dependencies',
          body: 'Update project dependencies',
          date: '2019-06-23T02:16:29.000Z',
          parents: [
            'c37be997b176292953629959e038ae88074bbfba',
            'ccf6ad89a643c321f43ec6063efa86f5a0b8a234',
          ],
          author: {
            name: 'Orta',
            email: 'ortam@microsoft.com',
          },
          committer: {
            name: 'GitHub',
            email: 'noreply@github.com',
          },
        },
        {
          repoUri: 'github.com/Microsoft/TypeScript-Node-Starter',
          id: 'fc4c2b2d25d51c543dc7134c12f8a825ea8d6230',
          message:
            'Merge pull request #88 from peterblazejewicz/feat/update-shelljs\n\nUpdate ShellJS version',
          body: 'Update ShellJS version',
          date: '2018-02-27T01:09:07.000Z',
          parents: [
            'd15b403884879c505ef7c18a2f7785f4e6e67a52',
            'd0403de6cfcfa5d2477cf38baad71db15e70965c',
          ],
          author: {
            name: 'Bowden Kelly',
            email: 'wilkelly@microsoft.com',
          },
          committer: {
            name: 'GitHub',
            email: 'noreply@github.com',
          },
        },
      ],
      repoAggregations: [
        {
          'github.com/Microsoft/TypeScript-Node-Starter': 2,
        },
      ],
    })
  );

  // 2. The first response should have 0 commit.
  const responseWithEmptyResult = await commitSearchClient.search({ query: 'string', page: 1 });
  expect(responseWithEmptyResult.commits!.length).toEqual(0);
  expect(responseWithEmptyResult.total).toEqual(0);
});
