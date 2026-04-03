/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  runPackStepCommonDefinition,
  type RunPackStepInput,
} from '../../../common/workflows/steps/run_pack_step';
import type { createActionService } from '../../handlers/action/create_action_service';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const getRunPackStepDefinition = (
  actionService: ReturnType<typeof createActionService>,
  osqueryContext: OsqueryAppContext
) =>
  createServerStepDefinition({
    ...runPackStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as RunPackStepInput;

      const hasTargeting =
        input.agent_ids?.length || input.agent_all || input.agent_platforms?.length || input.agent_policy_ids?.length;

      if (!hasTargeting) {
        return {
          error: new Error('At least one agent targeting method is required (agent_ids, agent_all, agent_platforms, or agent_policy_ids)'),
        };
      }

      try {
        const spaceId = context.contextManager.getContext().workflow?.spaceId ?? 'default';

        // Resolve human-readable name → SO ID via the action service
        const pack = await actionService.resolvePackByName(input.pack_id, spaceId);

        const { response } = await actionService.create(
          {
            pack_id: pack.savedObjectId,
            agent_ids: input.agent_ids,
            agent_all: input.agent_all,
            agent_platforms: input.agent_platforms,
            agent_policy_ids: input.agent_policy_ids,
            timeout: input.timeout,
            alert_ids: input.alert_ids,
            case_ids: input.case_ids,
            event_ids: input.event_ids,
            metadata: { source: 'workflows' },
          },
          { space: { id: spaceId } }
        );

        const queries = response.queries as Array<{ action_id?: string; id?: string }>;
        const queryActionIds = queries
          ?.map((q) => q.action_id)
          .filter((id): id is string => !!id) ?? [];
        const queryDetails = queries
          ?.filter((q) => q.action_id)
          .map((q) => ({
            action_id: q.action_id!,
            name: q.id ?? q.action_id!,
          })) ?? [];

        return {
          output: {
            action_id: response.action_id,
            total_agents: response.agents?.length ?? 0,
            query_action_ids: queryActionIds,
            queries: queryDetails,
          },
        };
      } catch (error) {
        context.logger.error('osquery.runPack failed', error as Error);

        return { error: error as Error };
      }
    },
  });
