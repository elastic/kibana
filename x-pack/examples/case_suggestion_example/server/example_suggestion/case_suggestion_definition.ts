/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SuggestionType, SuggestionHandlerParams } from '@kbn/cases-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type { SyntheticsMonitorSuggestion } from '../../common/types';

export const getExampleByServiceName = (dependencies: {
  savedObjectsClient: SavedObjectsClientContract;
  share: SharePluginStart;
}): SuggestionType<SyntheticsMonitorSuggestion> => {
  return {
    id: 'example',
    attachmentId: '.page',
    owner: 'observability',
    /* The tools object defines the parameters your suggestion handlers expect to receive
     * when called by an LLM. When an LLM chooses to use this tool, the associated
     * handler, matching the same key, will be called with the required params */
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
            timeRange: {
              type: 'object',
              description: 'The time range to search within',
              properties: {
                from: {
                  type: 'string',
                  description: 'The start time of the range, in ISO 8601 format',
                },
                to: {
                  type: 'string',
                  description: 'The end time of the range, in ISO 8601 format',
                },
              },
              required: ['from', 'to'],
            },
          },
        },
      },
    },
    handlers: {
      searchExampleByServiceName: async ({ context, request }: SuggestionHandlerParams) => {
        const { getExampleByServiceName: getExampleByServiceNameHandler } = await import(
          './handlers'
        );

        const { 'service.name': serviceName, timeRange } = context;

        /* All handler parameters are optional. If your required params
         * are not present, return an empty response rather than throwing
         * an error to indicate that assets are not available for the
         * provided context
         *
         * You could alternatively create a runtime schema to validate your required parameters */
        if (!serviceName || !timeRange) {
          return {
            suggestions: [],
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
