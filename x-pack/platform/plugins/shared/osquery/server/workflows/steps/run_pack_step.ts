/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  runPackStepCommonDefinition,
  type RunPackStepInput,
} from '../../../common/workflows/steps/run_pack_step';
import type { createActionService } from '../../handlers/action/create_action_service';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getWorkflowRequest, getWorkflowUserMetadata, requireOsqueryWriteAuthz } from './utils';

export const getRunPackStepDefinition = (
  actionService: ReturnType<typeof createActionService>,
  osqueryContext: OsqueryAppContext
) =>
  createServerStepDefinition({
    ...runPackStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as RunPackStepInput;

      const hasTargeting =
        input.agent_ids?.length ||
        input.agent_all ||
        input.agent_platforms?.length ||
        input.agent_policy_ids?.length;

      if (!hasTargeting) {
        throw new ExecutionError({
          type: 'ValidationError',
          message:
            'At least one agent targeting method is required (agent_ids, agent_all, agent_platforms, or agent_policy_ids)',
        });
      }

      const fakeRequest = getWorkflowRequest(context);

      await requireOsqueryWriteAuthz(osqueryContext, fakeRequest, { pack_id: input.pack_id });

      const userMetadata = await getWorkflowUserMetadata(fakeRequest, osqueryContext);

      const workflowCtx = context.contextManager.getContext();
      const spaceId = workflowCtx.workflow.spaceId;
      const workflowId = workflowCtx.workflow.id;
      const executionId = workflowCtx.execution.id;

      try {
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
            metadata: {
              source: 'workflows',
              workflow_id: workflowId,
              execution_id: executionId,
              currentUser: userMetadata.currentUser,
              userProfileUid: userMetadata.userProfileUid,
            },
          },
          { space: { id: spaceId } }
        );

        const queries = response.queries as Array<{ action_id?: string; id?: string }>;
        const queryActionIds =
          queries?.map((q) => q.action_id).filter((id): id is string => !!id) ?? [];
        const queryDetails =
          queries
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
        if (error instanceof ExecutionError) {
          throw error;
        }

        const message = (error as Error).message ?? String(error);

        if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('404')) {
          throw new ExecutionError({
            type: 'NotFoundError',
            message: `Pack not found: ${input.pack_id}`,
          });
        }

        if (message.toLowerCase().includes('license')) {
          throw new ExecutionError({
            type: 'LicenseError',
            message: 'Osquery requires a Platinum or higher license.',
          });
        }

        context.logger.error('osquery.runPack failed', error as Error);

        throw new ExecutionError({
          type: 'RuntimeError',
          message,
        });
      }
    },
  });
