/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core/server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import dedent from 'dedent';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import { assertNotPaused } from '../../../routes/utils/assert_not_paused';
import { classifyError } from '../../../agent_builder/utils/error_utils';

export const SIGNIFICANT_EVENTS_INVESTIGATION_START_TOOL_ID =
  'platform.sig_events.investigation_start';

const DEFAULT_COMPLETION_TIMEOUT_SEC = 120;

const investigationStartSchema = z.object({
  message: z
    .string()
    .min(1)
    .describe(
      'Clear description of the issue to investigate. Include symptoms, time range, and relevant context.'
    ),
  stream_names: z
    .array(z.string())
    .optional()
    .describe('Optional data stream names to scope observability queries.'),
  context: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Optional structured context such as significant-event metadata or alert payload. Passed verbatim to the investigation agent.'
    ),
  concurrency_key: z
    .string()
    .optional()
    .describe(
      'Optional stable key (e.g. significant-event id or alert uuid) used to de-duplicate concurrent investigations.'
    ),
  waitForCompletion: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'When true (default), wait up to ~120s for the investigation to finish before returning. Longer runs return a still-running execution.'
    ),
});

type WorkflowManagementApi = WorkflowsServerPluginSetup['management'];

export const createInvestigationStartTool = ({
  maintenanceService,
  getWorkflowApi,
  getSpaceId,
}: {
  maintenanceService: SignificantEventsMaintenanceService;
  getWorkflowApi: () => WorkflowManagementApi | undefined;
  getSpaceId: (request: KibanaRequest) => string;
}): BuiltinSkillBoundedTool<typeof investigationStartSchema> => ({
  id: SIGNIFICANT_EVENTS_INVESTIGATION_START_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Start the Streams significant-events investigation workflow for an observability issue,
    significant event, or alert.

    Prefer this tool over \`platform.core.execute_workflow\` for investigations: it enforces the
    deployment-wide Significant Events pause gate and always targets the managed investigation
    workflow.

    Returns the workflow execution (and structured RCA findings when the run finishes within the
    wait window). Use \`platform.core.get_workflow_execution_status\` when the execution is still
    running after the wait window.
  `,
  schema: investigationStartSchema,
  handler: async (
    {
      message,
      stream_names: streamNames,
      context,
      concurrency_key: concurrencyKey,
      waitForCompletion,
    },
    { request }
  ) => {
    try {
      // Agent Builder otherwise uses platform.core.execute_workflow, which only checks
      // workflow.enabled — not the maintenance SO — so pause must be enforced here.
      await assertNotPaused({ maintenanceService, request });

      const workflowApi = getWorkflowApi();
      if (!workflowApi) {
        throw new Error(
          'Workflows management is not available. Ensure the workflows plugin is enabled.'
        );
      }

      const spaceId = getSpaceId(request);
      const inputs: Record<string, unknown> = {
        message,
        ...(streamNames ? { stream_names: streamNames } : {}),
        ...(context ? { context } : {}),
        ...(concurrencyKey ? { concurrency_key: concurrencyKey } : {}),
      };

      const executeResult = await workflowApi.executeWorkflow({
        workflowId: SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
        inputs,
        request,
        spaceId,
        waitForCompletion: waitForCompletion ?? true,
        completionTimeoutSec: DEFAULT_COMPLETION_TIMEOUT_SEC,
        triggeredBy: 'sigevents-investigation-agent-builder',
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              workflowExecutionId: executeResult.workflowExecutionId,
              timedOut: executeResult.timedOut,
              execution: executeResult.execution ?? null,
            },
          },
        ],
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to start investigation: ${errorMessage}`,
              operation: 'investigation_start',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
