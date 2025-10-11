/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionRegistrationParameters } from '.';
import { ELASTICSEARCH_FUNCTION_NAME, RETRIEVE_ES_API_DOC_FUNCTION_NAME } from '..';

export function registerRetrieveEsApiDocFunction({
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: RETRIEVE_ES_API_DOC_FUNCTION_NAME,
      description:
        'Retrieve Elasticsearch API documentation to understand how to use Elasticsearch APIs',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'The query to use to retrieve documentation for an Elasticsearch API endpoint, for example "search API" or "create index API", it uses descriptions, summary and title of Elasticsearch APIs to find the most relevant ones',
          },
        },
        required: ['query'] as const,
      },
    },
    async ({ arguments: { query } }) => {
      const esClient = (await resources.context.core).elasticsearch.client;

      const response = await esClient.asCurrentUser.transport.request({
        method: 'POST',
        path: `/kibana_ai_es_api_doc/_search`,
        body: {
          size: 3,
          query: {
            bool: {
              should: [
                {
                  semantic: {
                    field: 'description',
                    query,
                  },
                },
                {
                  semantic: {
                    field: 'summary',
                    query,
                  },
                },
                {
                  semantic: {
                    field: 'title',
                    query,
                  },
                },
              ],
            },
          },
          highlight: {
            fields: {
              summary: {
                type: 'semantic',
                order: 'score',
              },
            },
          },
        },
      });

      return { content: { response } };
    }
  );
}

export function registerElasticsearchFunction({
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: ELASTICSEARCH_FUNCTION_NAME,
      description:
        'Call Elasticsearch APIs on behalf of the user. Make sure the request body is valid for the API that you are using. Only call this function when the user has explicitly requested it. Only GET requests and requests for /_search (GET and POST) are allowed',
      descriptionForUser: 'Call Elasticsearch APIs on behalf of the user',
      parameters: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            description: 'The HTTP method of the Elasticsearch endpoint',
            enum: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'] as const,
          },
          path: {
            type: 'string',
            description: 'The path of the Elasticsearch endpoint, including query parameters',
          },
          body: {
            type: 'object',
            description: 'The body of the request',
          },
        },
        required: ['method', 'path'] as const,
      },
    },
    async ({ arguments: { method, path, body } }) => {
      // Allowlist: (1) all GET requests, (2) POST requests whose *final* path segment is exactly "_search".
      const [pathWithoutQuery] = path.split('?');
      const pathSegments = pathWithoutQuery.replace(/^\//, '').split('/');
      const lastPathSegment = pathSegments[pathSegments.length - 1];
      const isSearchEndpoint = lastPathSegment === '_search';

      if (method !== 'GET' && !(method === 'POST' && isSearchEndpoint)) {
        throw new Error(
          'Only GET requests or POST requests to the "_search" endpoint are permitted through this assistant function.'
        );
      }

      const esClient = (await resources.context.core).elasticsearch.client;
      const response = await esClient.asCurrentUser.transport.request({
        method,
        path,
        body,
      });

      return { content: { response } };
    }
  );
}
