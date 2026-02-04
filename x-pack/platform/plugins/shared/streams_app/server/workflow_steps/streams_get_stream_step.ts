/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { streamsGetStreamStepCommonDefinition } from '../../common/workflow_steps';

type GetStreamResponse = Record<string, unknown>;

export const streamsGetStreamStepDefinition = createServerStepDefinition({
  ...streamsGetStreamStepCommonDefinition,
  handler: async (context) => {
    try {
      const { name } = context.input;

      context.logger.debug(`Fetching stream: ${name}`);

      const response = await context.contextManager.makeKibanaRequest<GetStreamResponse>({
        path: `/api/streams/${encodeURIComponent(name)}`,
        method: 'GET',
      });

      context.logger.debug(`Successfully fetched stream: ${name}`);

      return {
        output: {
          stream: response,
        },
      };
    } catch (error) {
      context.logger.error('Failed to get stream', error as Error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to get stream'),
      };
    }
  },
});
