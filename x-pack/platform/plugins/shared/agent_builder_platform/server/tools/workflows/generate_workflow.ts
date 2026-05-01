/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { generateWorkflow } from '@kbn/agent-builder-workflow-gen';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

const generateWorkflowSchema = z.object({
  query: z.string().describe('A natural-language description of the workflow to generate.'),
  context: z
    .string()
    .optional()
    .describe(
      '(optional) Additional context that could be useful to generate the workflow (e.g. related conversation, environment hints).'
    ),
  instructions: z
    .string()
    .optional()
    .describe(
      '(optional) Additional instructions to steer the generation (system-prompt extras).'
    ),
});

export const generateWorkflowTool = ({
  workflowsManagement,
}: {
  workflowsManagement: WorkflowsServerPluginSetup;
}): BuiltinToolDefinition<typeof generateWorkflowSchema> => {
  const { management: workflowsApi } = workflowsManagement;

  return {
    id: platformCoreTools.generateWorkflow,
    type: ToolType.builtin,
    description: cleanPrompt(`Generate an Elastic workflow YAML definition from a natural-language description.

      Returns the validated workflow definition in the response.
      Use this tool when the user asks to create, draft, or scaffold a new workflow.
    `),
    schema: generateWorkflowSchema,
    handler: async (
      { query, context, instructions },
      { modelProvider, logger, request, spaceId }
    ) => {
      const model = await modelProvider.getDefaultModel();

      try {
        const { workflow } = await generateWorkflow({
          nlQuery: query,
          additionalContext: context,
          additionalInstructions: instructions,
          model,
          logger,
          request,
          spaceId,
          workflowsApi,
        });

        return {
          results: [otherResult({ workflow })],
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          results: [errorResult(message)],
        };
      }
    },
    tags: [],
  };
};
