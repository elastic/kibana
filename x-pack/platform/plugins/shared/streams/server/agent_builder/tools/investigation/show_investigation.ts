/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformStreamsSigEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { GetScopedClients } from '../../../routes/types';
import type { StreamsServer } from '../../../types';
import { INVESTIGATION_ATTACHMENT_TYPE } from '../../../../common';
import { createSigEventsAvailability } from '../sig_events_availability';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';

export const STREAMS_SHOW_INVESTIGATION_TOOL_ID = platformStreamsSigEventsTools.showInvestigation;

const showInvestigationSchema = z.object({
  discovery_id: z.string().describe(
    i18n.translate('xpack.streams.agentBuilder.tools.showInvestigation.schema.discoveryId', {
      defaultMessage:
        'The discovery_id of the significant event whose investigation results to visualize.',
    })
  ),
});

export function createShowInvestigationTool({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): StaticToolRegistration<typeof showInvestigationSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof showInvestigationSchema> = {
    id: STREAMS_SHOW_INVESTIGATION_TOOL_ID,
    type: ToolType.builtin,
    description: i18n.translate('xpack.streams.agentBuilder.tools.showInvestigation.description', {
      defaultMessage:
        'Fetch and visualize the investigation results for a significant event discovery. ' +
        'Creates an inline attachment with hypothesis verdicts, confidence scores, remediation options, and access gaps. ' +
        'Always call this after run_investigation once the workflow has completed.',
    }),
    schema: showInvestigationSchema,
    tags: ['streams', 'significant_events', 'investigation'],
    availability: createSigEventsAvailability({ server, logger }),
    handler: async ({ discovery_id }, context) => {
      const { request } = context;

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
                    'xpack.streams.agentBuilder.tools.showInvestigation.notFound',
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

        if (!latest.investigation) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  discovery_id,
                  message: i18n.translate(
                    'xpack.streams.agentBuilder.tools.showInvestigation.notReady',
                    {
                      defaultMessage:
                        'Investigation for discovery "{id}" has not completed yet. The workflow may still be running — try again in a few minutes.',
                      values: { id: discovery_id },
                    }
                  ),
                },
              },
            ],
          };
        }

        const { investigation } = latest;
        const { completed_at, workflow_execution_id, ...investigationResult } = investigation;

        const attachment = await context.attachments.add(
          {
            type: INVESTIGATION_ATTACHMENT_TYPE,
            data: investigationResult,
            description: i18n.translate(
              'xpack.streams.agentBuilder.tools.showInvestigation.attachmentDescription',
              {
                defaultMessage: 'Investigation: {title}',
                values: { title: latest.title },
              }
            ),
            origin: discovery_id,
          },
          ATTACHMENT_REF_ACTOR.agent
        );

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                attachment_id: attachment.id,
                discovery_id,
                contributing_factors: investigation.contributing_factors,
                confidence: investigation.confidence,
                alternatives_ruled_out_count: investigation.alternatives_ruled_out.length,
                message: i18n.translate(
                  'xpack.streams.agentBuilder.tools.showInvestigation.success',
                  {
                    defaultMessage:
                      'Investigation results loaded for "{title}". Contributing factors: {contributingFactors} (confidence: {confidence}%). {alternativeCount} alternative(s) ruled out.',
                    values: {
                      title: latest.title,
                      contributingFactors: investigation.contributing_factors,
                      confidence: Math.round(investigation.confidence * 100),
                      alternativeCount: investigation.alternatives_ruled_out.length,
                    },
                  }
                ),
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running show_investigation: ${message}`);
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
