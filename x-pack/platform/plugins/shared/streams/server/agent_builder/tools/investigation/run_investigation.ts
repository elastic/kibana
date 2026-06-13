/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformStreamsSigEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { InvestigationInput } from '@kbn/streams-schema';
import type { GetScopedClients } from '../../../routes/types';
import type { StreamsServer } from '../../../types';
import { InvestigationService } from '../../../lib/sig_events/investigations/investigation_service';
import { createSigEventsAvailability } from '../sig_events_availability';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';

export const STREAMS_RUN_INVESTIGATION_TOOL_ID = platformStreamsSigEventsTools.runInvestigation;

const runInvestigationSchema = z.object({
  discovery_id: z.string().describe(
    i18n.translate('xpack.streams.agentBuilder.tools.runInvestigation.schema.discoveryId', {
      defaultMessage: 'The discovery_id of the significant event to investigate.',
    })
  ),
});

export function createRunInvestigationTool({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): StaticToolRegistration<typeof runInvestigationSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof runInvestigationSchema> = {
    id: STREAMS_RUN_INVESTIGATION_TOOL_ID,
    type: ToolType.builtin,
    description: i18n.translate('xpack.streams.agentBuilder.tools.runInvestigation.description', {
      defaultMessage:
        'Trigger a root cause analysis investigation for a significant event discovery. ' +
        'Returns the workflow execution ID. After calling this tool, call show_investigation to visualize the results once the workflow completes.',
    }),
    schema: runInvestigationSchema,
    tags: ['streams', 'significant_events', 'investigation'],
    availability: createSigEventsAvailability({ server, logger }),
    handler: async ({ discovery_id }, context) => {
      const { request, spaceId } = context;

      try {
        const { getDiscoveryClient, licensing, uiSettingsClient } = await getScopedClients({
          request,
        });
        await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

        const { hits } = await getDiscoveryClient().findById(discovery_id);
        if (hits.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: i18n.translate(
                    'xpack.streams.agentBuilder.tools.runInvestigation.notFound',
                    {
                      defaultMessage: 'Discovery {id} not found.',
                      values: { id: discovery_id },
                    }
                  ),
                },
              },
            ],
          };
        }

        const latest = hits.at(-1)!;

        if (!server.workflowsExtensions) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: i18n.translate(
                    'xpack.streams.agentBuilder.tools.runInvestigation.noWorkflows',
                    {
                      defaultMessage:
                        'Workflows extension is not available. Cannot trigger investigation.',
                    }
                  ),
                },
              },
            ],
          };
        }

        const investigationService = new InvestigationService(server.workflowsExtensions, logger);

        const inputs: InvestigationInput = {
          event_id: latest.workflow_execution_id ?? discovery_id,
          discovery_id,
          discovery_slug: latest.discovery_slug,
          title: latest.title ?? '',
          summary: latest.summary ?? '',
          root_cause: latest.root_cause ?? '',
          impact: latest.impact ?? '',
          stream_names: latest.stream_names ?? [],
          cause_kis: latest.cause_kis ?? [],
          evidences: latest.evidences ?? [],
        };

        await investigationService.triggerWithInputs({
          inputs,
          request,
          space: spaceId ?? DEFAULT_SPACE_ID,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                discovery_id,
                title: latest.title,
                message: i18n.translate(
                  'xpack.streams.agentBuilder.tools.runInvestigation.started',
                  {
                    defaultMessage:
                      'Investigation workflow started for "{title}". Call show_investigation with discovery_id "{id}" to visualize results once the workflow completes.',
                    values: { title: latest.title, id: discovery_id },
                  }
                ),
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running run_investigation: ${message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
