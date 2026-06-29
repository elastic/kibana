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
import { sigEventInvestigationResultStatusSchema } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import type { StreamsServer } from '../../../types';
import { createSigEventsAvailability } from '../sig_events_availability';
import { attachEventInvestigationToolHandler } from './handler';

export const STREAMS_EVENT_INVESTIGATION_ATTACH_TOOL_ID =
  platformStreamsSigEventsTools.attachInvestigation;

const eventInvestigationAttachSchema = z.object({
  event_id: z.string().describe(
    i18n.translate('xpack.streams.agentBuilder.tools.eventInvestigationAttach.schema.eventId', {
      defaultMessage: 'Identifier of the significant event to attach the investigation to.',
    })
  ),
  workflow_execution_id: z.string().describe(
    i18n.translate(
      'xpack.streams.agentBuilder.tools.eventInvestigationAttach.schema.workflowExecutionId',
      {
        defaultMessage:
          'The investigation workflow execution id returned by execute_workflow. Used to fetch detailed RCA data.',
      }
    )
  ),
  result_status: sigEventInvestigationResultStatusSchema.describe(
    i18n.translate(
      'xpack.streams.agentBuilder.tools.eventInvestigationAttach.schema.resultStatus',
      {
        defaultMessage: 'Terminal status of the investigation: "success" or "failed".',
      }
    )
  ),
  completed_date: z.iso.datetime({ offset: true }).describe(
    i18n.translate(
      'xpack.streams.agentBuilder.tools.eventInvestigationAttach.schema.completedDate',
      {
        defaultMessage: 'ISO-8601 datetime when the investigation completed.',
      }
    )
  ),
});

export const createEventInvestigationAttachTool = ({
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof eventInvestigationAttachSchema> => {
  const toolDefinition: BuiltinToolDefinition<typeof eventInvestigationAttachSchema> = {
    id: STREAMS_EVENT_INVESTIGATION_ATTACH_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      ${i18n.translate('xpack.streams.agentBuilder.tools.eventInvestigationAttach.description', {
        defaultMessage:
          'Record a completed investigation run on a significant event. Call this after an investigation workflow finishes to link its execution id, status, and completion time back to the event.',
      })}
    `,
    schema: eventInvestigationAttachSchema,
    tags: ['streams', 'significant_events'],
    availability: createSigEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      try {
        const { getEventClient, licensing, uiSettingsClient } = await getScopedClients({ request });
        await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

        const data = await attachEventInvestigationToolHandler({
          eventClient: getEventClient(),
          eventId: toolParams.event_id,
          workflowExecutionId: toolParams.workflow_execution_id,
          resultStatus: toolParams.result_status,
          completedDate: toolParams.completed_date,
        });

        telemetry.trackAgentToolEventInvestigationAttach({
          success: true,
          event_id: toolParams.event_id,
          workflow_execution_id: toolParams.workflow_execution_id,
        });

        return { results: [{ type: ToolResultType.other, data }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running event_investigation_attach: ${message}`);
        telemetry.trackAgentToolEventInvestigationAttach({
          success: false,
          event_id: toolParams.event_id,
          workflow_execution_id: toolParams.workflow_execution_id,
          error_message: message,
        });
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: i18n.translate(
                  'xpack.streams.agentBuilder.tools.eventInvestigationAttach.errorMessage',
                  {
                    defaultMessage:
                      'Failed to attach investigation to significant event: {message}',
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
};
