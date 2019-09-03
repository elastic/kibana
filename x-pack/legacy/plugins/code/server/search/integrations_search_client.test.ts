/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { AnyObject, EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { IntegrationsSearchClient } from './integraions_search_client';

let integSearchClient: IntegrationsSearchClient;
let esClient;

// Setup the entire RepositorySearchClient.
function initSearchClient() {
  const log: Logger = (sinon.stub() as any) as Logger;
  esClient = initEsClient();

  integSearchClient = new IntegrationsSearchClient(esClient, log);
}

const mockSearchResults = [
  // 1. The first response is a valid DocumentSearchResult with 1 doc
  {
    took: 1,
    hits: {
      total: {
        value: 1,
      },
      hits: [
        {
          _source: {
            repoUri: 'github.com/Microsoft/TypeScript-Node-Starter',
            path: 'src/types/express-flash.d.ts',
            content:
              "\n/// <reference types='express' />\n\n// Add RequestValidation Interface on to Express's Request Interface.\ndeclare namespace Express {\n    interface Request extends Flash {}\n}\n\ninterface Flash {\n    flash(type: string, message: any): void;\n}\n\ndeclare module 'express-flash';\n\n",
            language: 'typescript',
            qnames: ['express-flash', 'Express', 'Request', 'Flash', 'flash'],
          },
          highlight: {
            content: [
              'declare namespace Express {\n    interface Request extends Flash {}\n}\n\ninterface Flash {\n    flash(type: _@-string-@_',
            ],
          },
        },
      ],
    },
  },
  // 2. The second response is a valid DocumentSearchResult with 0 doc
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
      language: {
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

test('Document search', async () => {
  // 1. The first response should have 1 result.
  const responseWithResult = await integSearchClient.resolveSnippets({
    repoUri: 'github.com/Microsoft/TypeScript-Node-Starter',
    filePath: 'src/types/express-flash.d.ts',
    lineNumStart: 3,
    lineNumEnd: 7,
  });
  expect(responseWithResult).toEqual(
    expect.objectContaining({
      took: 1,
      total: 1,
      results: [
        {
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
          filePath: 'src/types/express-flash.d.ts',
          compositeContent: {
            // Content is shorted
            content:
              "\n/// <reference types='express' />\n\n// Add RequestValidation Interface on to Express's Request Interface.\ndeclare namespace Express {\n    interface Request extends Flash {}\n}\n\ninterface Flash {\n",
            // Line mapping data is populated
            lineMapping: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '..'],
            // Highlight ranges are calculated
            ranges: [
              {
                endColumn: 1,
                endLineNumber: 7,
                startColumn: 1,
                startLineNumber: 3,
              },
            ],
          },
          language: 'typescript',
          hits: 1,
        },
      ],
    })
  );

  // 2. The first response should have 0 results.
  const responseWithEmptyResult = await integSearchClient.resolveSnippets({
    repoUri: 'github.com/Microsoft/TypeScript-Node-Starter',
    filePath: 'src/types/foo-bar',
    lineNumStart: 3,
    lineNumEnd: 7,
  });
  expect(responseWithEmptyResult.results!.length).toEqual(0);
  expect(responseWithEmptyResult.total).toEqual(0);
});
