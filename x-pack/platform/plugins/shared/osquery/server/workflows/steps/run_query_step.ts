/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  runQueryStepCommonDefinition,
  type RunQueryStepInput,
} from '../../../common/workflows/steps/run_query_step';
import type { createActionService } from '../../handlers/action/create_action_service';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getWorkflowRequest, getWorkflowUserMetadata, requireOsqueryWriteAuthz } from './utils';

export const getRunQueryStepDefinition = (
  actionService: ReturnType<typeof createActionService>,
  osqueryContext: OsqueryAppContext
) =>
  createServerStepDefinition({
    ...runQueryStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as RunQueryStepInput;

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

      await requireOsqueryWriteAuthz(osqueryContext, fakeRequest, {
        saved_query_id: input.saved_query_id,
      });

      const userMetadata = await getWorkflowUserMetadata(fakeRequest, osqueryContext);

      const workflowCtx = context.contextManager.getContext();
      const spaceId = workflowCtx.workflow.spaceId;
      const workflowId = workflowCtx.workflow.id;
      const executionId = workflowCtx.execution.id;

      try {
        const savedQuery = await actionService.resolveSavedQueryByName(
          input.saved_query_id,
          spaceId
        );

        const { response } = await actionService.create(
          {
            saved_query_id: savedQuery.savedObjectId,
            query: savedQuery.query,
            ecs_mapping:
              (input.ecs_mapping as
                | Record<string, { field?: string; value?: string | string[] }>
                | undefined) ?? savedQuery.ecsMapping,
            timeout: input.timeout ?? savedQuery.timeout,
            agent_ids: input.agent_ids,
            agent_all: input.agent_all,
            agent_platforms: input.agent_platforms,
            agent_policy_ids: input.agent_policy_ids,
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

        const queries = response.queries as Array<{ action_id?: string }>;

        return {
          output: {
            action_id: response.action_id,
            total_agents: response.agents?.length ?? 0,
            query_action_id: queries?.[0]?.action_id ?? response.action_id,
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

        if (message.toLowerCase().includes('license')) {
          throw new ExecutionError({
            type: 'LicenseError',
            message: 'Osquery requires a Platinum or higher license.',
          });
        }

        context.logger.error('osquery.runQuery failed', error as Error);

        throw new ExecutionError({
          type: 'RuntimeError',
          message,
        });
      }
    },
  });
