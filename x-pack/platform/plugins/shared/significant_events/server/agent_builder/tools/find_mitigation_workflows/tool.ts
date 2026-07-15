/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createSignificantEventsAvailability } from '../significant_events_availability';

export const SIGNIFICANT_EVENTS_FIND_MITIGATION_WORKFLOWS_TOOL_ID =
  platformSignificantEventsTools.findMitigationWorkflows;

/** Tag that marks a workflow as a curated mitigation, discoverable by this tool. */
export const MITIGATION_WORKFLOW_TAG = 'mitigation';

const findMitigationWorkflowsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      i18n.translate(
        'xpack.significantEvents.agentBuilder.tools.findMitigationWorkflows.schema.query',
        {
          defaultMessage:
            'Optional free-text search over workflow names and descriptions to narrow the list. ' +
            'Omit it to get all curated mitigation workflows.',
        }
      )
    ),
});

export function createFindMitigationWorkflowsTool({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): StaticToolRegistration<typeof findMitigationWorkflowsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof findMitigationWorkflowsSchema> = {
    id: SIGNIFICANT_EVENTS_FIND_MITIGATION_WORKFLOWS_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      ${i18n.translate(
        'xpack.significantEvents.agentBuilder.tools.findMitigationWorkflows.description.line1',
        {
          defaultMessage:
            'List the curated mitigation workflows available in this space — user-prepared, ' +
            'inherently destructive remediation actions (restarts, scaling, rollbacks). Each result ' +
            'carries the workflow id, its trigger inputs schema, and its auto-run policy metadata.',
        }
      )}

      ${i18n.translate(
        'xpack.significantEvents.agentBuilder.tools.findMitigationWorkflows.description.line2',
        {
          defaultMessage:
            'NEVER execute these workflows yourself. Only PROPOSE them as structured next steps ' +
            '(with the workflow id verbatim and concrete inputs matching the inputs schema); ' +
            'whether one runs is decided downstream by an auto-run gate or a human.',
        }
      )}
    `,
    schema: findMitigationWorkflowsSchema,
    tags: ['streams', 'significant_events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;

      try {
        const { licensing, uiSettingsClient } = await getScopedClients({ request });
        await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

        const { workflowsManagement, spaces } = server;
        if (!workflowsManagement) {
          throw new Error('Workflows management is not available');
        }

        const spaceId = spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        const { results } = await workflowsManagement.management.getWorkflows(
          {
            tags: [MITIGATION_WORKFLOW_TAG],
            enabled: [true],
            query: toolParams.query,
            size: 50,
            page: 1,
          },
          spaceId
        );

        const workflows = results
          .filter((workflow) => workflow.valid && workflow.definition)
          .map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            inputs:
              workflow.definition?.triggers?.find((trigger) => trigger.type === 'manual')?.inputs ??
              null,
            mitigation: workflow.definition?.metadata?.mitigation ?? null,
          }));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { total: workflows.length, workflows },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running find_mitigation_workflows: ${message}`);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: i18n.translate(
                  'xpack.significantEvents.agentBuilder.tools.findMitigationWorkflows.errorMessage',
                  {
                    defaultMessage: 'Failed to find mitigation workflows: {message}',
                    values: { message },
                  }
                ),
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
