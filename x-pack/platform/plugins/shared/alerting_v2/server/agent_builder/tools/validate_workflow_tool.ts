/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';

const validateWorkflowSchema = z.object({
  yaml: z.string().describe('The complete workflow YAML string to validate'),
});

export const validateWorkflowTool = (
  api: WorkflowsManagementApi
): BuiltinToolDefinition<typeof validateWorkflowSchema> => ({
  id: 'platform.workflows.validate_workflow',
  type: ToolType.builtin,
  description:
    'Validate a workflow YAML string against all validation rules. ' +
    'Checks YAML syntax, schema conformance, step name uniqueness, and Liquid template syntax.',
  tags: ['workflows', 'yaml', 'validation'],
  schema: validateWorkflowSchema,
  handler: async ({ yaml }, { spaceId, request }) => {
    const result = await api.validateWorkflow(yaml, spaceId, request);
    return {
      results: [
        {
          type: ToolResultType.other,
          data: { result },
        },
      ],
    };
  },
});
