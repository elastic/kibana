/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { makeKibanaRequest } from './utils/make_kibana_request';
import { streamsListStreamsStepCommonDefinition } from '../../common/workflow_steps';

interface ListStreamsResponse {
  streams: Array<Record<string, unknown>>;
}

export const streamsListStreamsStepDefinition = createServerStepDefinition({
  ...streamsListStreamsStepCommonDefinition,
  handler: async (context) => {
    try {
      const workflowContext = context.contextManager.getContext();
      const fakeRequest = context.contextManager.getFakeRequest();

      context.logger.debug('Fetching list of streams');

      const response = await makeKibanaRequest<ListStreamsResponse>({
        kibanaUrl: workflowContext.kibanaUrl,
        path: '/api/streams',
        method: 'GET',
        fakeRequest,
        abortSignal: context.abortSignal,
      });

      context.logger.debug(`Successfully fetched ${response.streams.length} streams`);

      return {
        output: {
          streams: response.streams,
        },
      };
    } catch (error) {
      context.logger.error('Failed to list streams', error as Error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to list streams'),
      };
    }
  },
});
