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
import { i18n } from '@kbn/i18n';
import { significantEventSchema } from '@kbn/significant-events-schema';
import dedent from 'dedent';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import { updateEventStatusToolHandler } from './handler';

export const SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID =
  platformSignificantEventsTools.updateEventStatus;

const eventStatusUpdateSchema = significantEventSchema.pick({
  status: true,
  event_uuid: true,
});

export function createEventStatusUpdateTool({
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof eventStatusUpdateSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof eventStatusUpdateSchema> = {
    id: SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      ${i18n.translate('xpack.significantEvents.agentBuilder.tools.eventStatusUpdate.description', {
        defaultMessage: 'Update the status of an existing significant event.',
      })}
    `,
    schema: eventStatusUpdateSchema,
    tags: ['streams', 'significant_events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      try {
        const { getEventClient, licensing } = await getScopedClients({ request });
        await assertSignificantEventsAccess({ server, licensing });

        const data = await updateEventStatusToolHandler({
          eventClient: getEventClient(),
          eventUuid: toolParams.event_uuid,
          status: toolParams.status,
        });

        telemetry.trackAgentToolEventStatusUpdate({
          success: true,
          event_uuid: toolParams.event_uuid,
          status: toolParams.status,
        });

        return { results: [{ type: ToolResultType.other, data }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running event_status_update: ${message}`);
        telemetry.trackAgentToolEventStatusUpdate({
          success: false,
          event_uuid: toolParams.event_uuid,
          status: toolParams.status,
          error_message: message,
        });
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: i18n.translate(
                  'xpack.significantEvents.agentBuilder.tools.eventStatusUpdate.errorMessage',
                  {
                    defaultMessage: 'Failed to update significant event status: {message}',
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
