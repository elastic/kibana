/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  getSavedQueryStepCommonDefinition,
  type GetSavedQueryStepInput,
} from '../../../common/workflows/steps/get_saved_query_step';
import type { createActionService } from '../../handlers/action/create_action_service';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getWorkflowRequest, requireOsqueryReadAuthz } from './utils';

export const getGetSavedQueryStepDefinition = (
  actionService: ReturnType<typeof createActionService>,
  osqueryContext: OsqueryAppContext
) =>
  createServerStepDefinition({
    ...getSavedQueryStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as GetSavedQueryStepInput;

      const fakeRequest = getWorkflowRequest(context);

      await requireOsqueryReadAuthz(osqueryContext, fakeRequest);

      const spaceId = context.contextManager.getContext().workflow.spaceId;

      try {
        const savedQuery = await actionService.resolveSavedQueryByName(
          input.saved_query_id,
          spaceId
        );

        return {
          output: {
            id: input.saved_query_id,
            query: savedQuery.query,
            description: savedQuery.description,
            platform: savedQuery.platform,
            ecs_mapping: savedQuery.ecsMapping as Record<string, unknown> | undefined,
            interval: savedQuery.timeout,
          },
        };
      } catch (error) {
        if (error instanceof ExecutionError) {
          throw error;
        }

        const message = (error as Error).message ?? String(error);

        if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('404')) {
          throw new ExecutionError({
            type: 'NotFoundError',
            message: `Saved query not found: ${input.saved_query_id}`,
          });
        }

        context.logger.error('osquery.getSavedQuery failed', error as Error);

        throw new ExecutionError({
          type: 'RuntimeError',
          message,
        });
      }
    },
  });
