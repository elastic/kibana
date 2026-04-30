/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import dedent from 'dedent';
import type { WorkflowsManagementApi } from '../../../lib/workflows/workflow_execution_client';
import { classifyError } from '../../utils/error_utils';
import { getKiIdentificationStatusToolHandler } from './handler';

export const STREAMS_KI_IDENTIFICATION_STATUS_TOOL_ID =
  'platform.streams.sig_events.ki_identification_status';

const onboardingStatusSchema = z.object({
  stream_name: z.string().describe('Target stream name, e.g. "logs.ecs.nginx".'),
});

export const createKiIdentificationStatusTool = ({
  workflowsManagementApi,
}: {
  workflowsManagementApi: WorkflowsManagementApi;
}): BuiltinSkillBoundedTool<typeof onboardingStatusSchema> => ({
  id: STREAMS_KI_IDENTIFICATION_STATUS_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Get current status for a stream KI identification workflow.

    Use this tool after starting KI identification to check whether the workflow is still
    running, completed, failed, or canceled.

    Use this tool to:
    - Poll KI identification workflow progress programmatically
    - Retrieve completed KI identification results
    - Inspect failure details when the workflow fails

    Returns:
    - On success: workflow execution status for the stream (includes terminal results when available)
    - On failure: an error result with \`message\`, \`operation\`, and \`likely_cause\`
  `,
  schema: onboardingStatusSchema,
  handler: async ({ stream_name: streamName }) => {
    try {
      const data = await getKiIdentificationStatusToolHandler({
        streamName,
        workflowsManagementApi,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data,
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to get KI identification workflow status for "${streamName}": ${message}`,
              stream: streamName,
              operation: 'ki_identification_status',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
