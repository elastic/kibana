/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionRegistrationParameters } from '.';
import { ELASTICSEARCH_FUNCTION_NAME } from '..';

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
      confirmationConfig: [
        {
          method: 'DELETE',
          message: 'This will permanently delete data from Elasticsearch',
          type: 'destructive',
          confirmButtonText: 'Delete',
        },
        {
          method: 'PUT',
          message: 'This will modify data in Elasticsearch',
          type: 'warning',
          confirmButtonText: 'Update',
        },
        {
          method: 'POST',
          message: 'This will create or update data in Elasticsearch',
          type: 'warning',
          confirmButtonText: 'Continue',
        },
      ],
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
