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
import dedent from 'dedent';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import type { StreamsServer } from '../../../types';
import { createSigEventsAvailability } from '../sig_events_availability';
import { updateEventVerdictToolHandler } from './handler';

export const STREAMS_EVENT_VERDICT_UPDATE_TOOL_ID =
  platformStreamsSigEventsTools.updateEventVerdict;

const eventVerdictUpdateSchema = z.object({
  event_id: z.string().describe(
    i18n.translate('xpack.streams.agentBuilder.tools.eventVerdictUpdate.schema.eventId', {
      defaultMessage: 'Identifier of the significant event to update.',
    })
  ),
  verdict: z.enum(['promoted', 'acknowledged', 'demoted']).describe(
    i18n.translate('xpack.streams.agentBuilder.tools.eventVerdictUpdate.schema.verdict', {
      defaultMessage: 'Target verdict value to set.',
    })
  ),
});

export function createEventVerdictUpdateTool({
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof eventVerdictUpdateSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof eventVerdictUpdateSchema> = {
    id: STREAMS_EVENT_VERDICT_UPDATE_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      ${i18n.translate('xpack.streams.agentBuilder.tools.eventVerdictUpdate.description', {
        defaultMessage: 'Update the verdict of an existing significant event.',
      })}
    `,
    schema: eventVerdictUpdateSchema,
    tags: ['streams', 'significant_events'],
    availability: createSigEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      try {
        const { getEventClient, licensing, uiSettingsClient } = await getScopedClients({ request });
        await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

        const data = await updateEventVerdictToolHandler({
          eventClient: getEventClient(),
          eventId: toolParams.event_id,
          verdict: toolParams.verdict,
        });

        telemetry.trackAgentToolEventVerdictUpdate({
          success: true,
          event_id: toolParams.event_id,
          verdict: toolParams.verdict,
        });

        return { results: [{ type: ToolResultType.other, data }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running event_verdict_update: ${message}`);
        telemetry.trackAgentToolEventVerdictUpdate({
          success: false,
          event_id: toolParams.event_id,
          verdict: toolParams.verdict,
          error_message: message,
        });
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: i18n.translate(
                  'xpack.streams.agentBuilder.tools.eventVerdictUpdate.errorMessage',
                  {
                    defaultMessage: 'Failed to update significant event verdict: {message}',
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
