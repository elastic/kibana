/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionRegistrationParameters } from '.';

export const ELASTICSEARCH_FUNCTION_NAME = 'elasticsearch';

export function registerElasticsearchFunction({
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerInstruction(({ availableFunctionNames }) => {
    if (availableFunctionNames.includes(ELASTICSEARCH_FUNCTION_NAME)) {
      return `You can use the ${ELASTICSEARCH_FUNCTION_NAME} tool to call Elasticsearch APIs on behalf of the user.
      You are only allowed to perform GET requests (Some examples for GET requests are: Retrieving cluster information, cluster license, cluster health, indices stats, index stats, etc.) and GET/POST requests for the \`/_search\` endpoint (for search operations).
      If the user asks to perform destructive actions or actions that are not allowed (e.g. PUT, PATCH, DELETE requests or POST requests that are not to the \`/_search\` endpoint), **NEVER** attempt to call the ${ELASTICSEARCH_FUNCTION_NAME} tool.
      Instead, inform the user that you do not have the capability to perform those actions.
      If you attempt to call the ${ELASTICSEARCH_FUNCTION_NAME} tool with disallowed methods (PUT, DELETE, PATCH, POST requests that are not to the \`/_search\` endpoint), it will fail.
      For POST \`/_search\` operations, if a request body is needed, make sure the request body is a valid object.`;
    }
    return '';
  });

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
