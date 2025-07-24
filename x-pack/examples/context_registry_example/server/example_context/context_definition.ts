/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextDefinitionServer, ContextRequest } from '@kbn/context-registry-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';

export const getExampleByServiceName = (dependencies: {
  savedObjectsClient: SavedObjectsClientContract;
  share: SharePluginStart;
}): ContextDefinitionServer => {
  return {
    key: 'example',
    tools: {
      searchExampleByServiceName: {
        description: 'Suggest synthetics monitor matching the same service.',
        schema: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Name of the relevant service',
            },
          },
        },
      },
    },
    handlers: {
      searchExampleByServiceName: async ({
        'service.name': serviceName,
        timeRange,
      }: ContextRequest) => {
        const { getExampleByServiceName: getExampleByServiceNameHandler } = await import(
          './handlers'
        );

        /* All handler parameters are optional. If your required params
         * are not present, return an empty response rather than throwing
         * an error to indicate that assets are not available for the
         * provided context
         *
         * You could alternatively create a runtime schema to validate your required parameters */
        if (!serviceName || !timeRange) {
          return {
            key: 'example',
            description: 'No monitors found for given context',
            data: [],
          };
        }
        /* Example of providing dependencies to your handler.
         * Dependencies must be provided by the registering plugin */
        return getExampleByServiceNameHandler({
          dependencies: {
            savedObjectsClient: dependencies.savedObjectsClient,
            share: dependencies.share,
          },
          params: {
            timeRange,
            serviceName,
          },
        });
      },
    },
  } as const;
};
