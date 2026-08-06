/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { hasWorkflowReadPrivilege } from '@kbn/agent-builder-tools-base/workflows';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { workflowIdSchema } from '@kbn/workflows-management-plugin/common/lib/workflow_id_schema';
import { z } from '@kbn/zod/v4';
import { workflowTools } from '../../common/constants';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export function registerGetWorkflowTool(
  agentBuilder: AgentBuilderPluginSetup,
  api: WorkflowsManagementApi,
  getSecurity: () => SecurityPluginStart | undefined
): void {
  agentBuilder.tools.register({
    id: workflowTools.getWorkflow,
    type: ToolType.builtin,
    description: `Retrieve a saved workflow by id from the current Kibana space.

Use this tool when you need metadata (name, description, enabled state) about an existing workflow,
or — when \`includeYaml\` is true — the full workflow YAML definition.

**When to use \`includeYaml: false\` (default):** Listing or comparing existing automations by title
and description without loading full definitions.

**When to use \`includeYaml: true\`:** The user asked to review an existing workflow, you are editing
a specific workflow and need its current YAML as a baseline, or the user explicitly wants a
YAML-level duplicate check before creating a new automation.`,
    schema: z.object({
      workflowId: workflowIdSchema.describe('The id of the workflow to retrieve.'),
      includeYaml: z
        .boolean()
        .optional()
        .describe(
          'When true, include the full workflow YAML. Defaults to false to save tokens — only id, name, description, and enabled are returned.'
        ),
    }),
    tags: ['workflows', 'yaml'],
    handler: async ({ workflowId, includeYaml }, { spaceId, request }) => {
      const canRead = await hasWorkflowReadPrivilege({
        security: getSecurity(),
        request,
        spaceId,
      });

      if (!canRead) {
        return {
          results: [
            errorResult(
              `Unauthorized to read workflow '${workflowId}'. The workflowsManagement read privilege is required.`
            ),
          ],
        };
      }

      const workflow = await api.getWorkflow(workflowId, spaceId);

      if (!workflow) {
        return {
          results: [errorResult(`Workflow '${workflowId}' was not found in this space.`)],
        };
      }

      return {
        results: [
          otherResult({
            id: workflow.id,
            name: workflow.name,
            description: workflow.description ?? '',
            enabled: workflow.enabled,
            ...(includeYaml === true ? { yaml: workflow.yaml } : {}),
          }),
        ],
      };
    },
  });
}
