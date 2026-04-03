/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  getSavedQueryStepCommonDefinition,
  type GetSavedQueryStepInput,
} from '../../../common/workflows/steps/get_saved_query_step';
import type { createActionService } from '../../handlers/action/create_action_service';

export const getGetSavedQueryStepDefinition = (
  actionService: ReturnType<typeof createActionService>
) =>
  createServerStepDefinition({
    ...getSavedQueryStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as GetSavedQueryStepInput;
      const spaceId = context.contextManager.getContext().workflow?.spaceId ?? 'default';

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
        context.logger.error('osquery.getSavedQuery failed', error as Error);

        return { error: error as Error };
      }
    },
  });
