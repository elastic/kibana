/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { streamsListFeaturesStepCommonDefinition } from '../../common/workflow_steps';

interface ListFeaturesResponse {
  features: Array<Record<string, unknown>>;
}

export const streamsListFeaturesStepDefinition = createServerStepDefinition({
  ...streamsListFeaturesStepCommonDefinition,
  handler: async (context) => {
    try {
      const { name, type } = context.input;

      context.logger.debug(`Fetching features for stream: ${name}`);

      const response = await context.contextManager.makeKibanaRequest<ListFeaturesResponse>({
        path: `/internal/streams/${encodeURIComponent(name)}/features`,
        method: 'GET',
        query: {
          type,
        },
      });

      context.logger.debug(
        `Successfully fetched ${response.features.length} features for stream: ${name}`
      );

      return {
        output: {
          features: response.features,
        },
      };
    } catch (error) {
      context.logger.error('Failed to list features', error as Error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to list features'),
      };
    }
  },
});
