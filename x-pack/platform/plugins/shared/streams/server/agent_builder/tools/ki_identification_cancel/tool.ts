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
import { cancelKiIdentificationToolHandler } from './handler';

export const STREAMS_KI_IDENTIFICATION_CANCEL_TOOL_ID =
  'platform.streams.sig_events.ki_identification_cancel';

const cancelSchema = z.object({
  stream_name: z.string().describe('Target stream name, e.g. "logs.ecs.nginx".'),
});

export const createKiIdentificationCancelTool = ({
  workflowsManagementApi,
}: {
  workflowsManagementApi: WorkflowsManagementApi;
}): BuiltinSkillBoundedTool<typeof cancelSchema> => ({
  id: STREAMS_KI_IDENTIFICATION_CANCEL_TOOL_ID,
  type: ToolType.builtin,
  description: dedent`
    Cancel an in-progress KI identification workflow for a stream.

    Use this tool to:
    - Stop a running KI identification workflow when the user requests cancellation

    Returns:
    - On success: cancel acknowledgement payload with stream and status
    - On failure: an error result with \`message\`, \`operation\`, and \`likely_cause\`
  `,
  schema: cancelSchema,
  handler: async ({ stream_name: streamName }) => {
    try {
      const data = await cancelKiIdentificationToolHandler({
        stream_name: streamName,
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
              message: `Failed to cancel KI identification workflow for "${streamName}": ${message}`,
              stream: streamName,
              operation: 'ki_identification_cancel',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
