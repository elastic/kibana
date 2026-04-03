/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  runQueryStepCommonDefinition,
  type RunQueryStepInput,
} from '../../../common/workflows/steps/run_query_step';
import type { createActionService } from '../../handlers/action/create_action_service';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const getRunQueryStepDefinition = (
  actionService: ReturnType<typeof createActionService>,
  osqueryContext: OsqueryAppContext
) =>
  createServerStepDefinition({
    ...runQueryStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as RunQueryStepInput;

      const hasTargeting =
        input.agent_ids?.length || input.agent_all || input.agent_platforms?.length || input.agent_policy_ids?.length;

      if (!hasTargeting) {
        return {
          error: new Error('At least one agent targeting method is required (agent_ids, agent_all, agent_platforms, or agent_policy_ids)'),
        };
      }

      try {
        const spaceId = context.contextManager.getContext().workflow?.spaceId ?? 'default';

        // Resolve human-readable name → SO ID + query text via the action service
        const savedQuery = await actionService.resolveSavedQueryByName(
          input.saved_query_id,
          spaceId
        );

        const { response } = await actionService.create(
          {
            saved_query_id: savedQuery.savedObjectId,
            query: savedQuery.query,
            ecs_mapping: input.ecs_mapping as Record<string, { field?: string; value?: string | string[] }> | undefined ?? savedQuery.ecsMapping,
            timeout: input.timeout ?? savedQuery.timeout,
            agent_ids: input.agent_ids,
            agent_all: input.agent_all,
            agent_platforms: input.agent_platforms,
            agent_policy_ids: input.agent_policy_ids,
            alert_ids: input.alert_ids,
            case_ids: input.case_ids,
            event_ids: input.event_ids,
            metadata: { source: 'workflows' },
          },
          { space: { id: spaceId } }
        );

        const queries = response.queries as Array<{ action_id?: string }>;

        return {
          output: {
            action_id: response.action_id,
            total_agents: response.agents?.length ?? 0,
            query_action_id: queries?.[0]?.action_id ?? response.action_id,
          },
        };
      } catch (error) {
        context.logger.error('osquery.runQuery failed', error as Error);

        return { error: error as Error };
      }
    },
  });
