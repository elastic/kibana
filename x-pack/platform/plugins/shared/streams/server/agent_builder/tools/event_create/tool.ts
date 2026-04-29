/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { Logger } from '@kbn/core/server';
import { sigEventSchema } from '@kbn/streams-schema';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import type { StreamsServer } from '../../../types';
import { createEventToolHandler } from './handler';

export const STREAMS_CREATE_EVENT_TOOL_ID = 'platform.streams.sig_events.event_create';

const createEventSchema = sigEventSchema.omit({ id: true });

export function createEventTool({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): BuiltinSkillBoundedTool<typeof createEventSchema> {
  return {
    id: STREAMS_CREATE_EVENT_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      Create a significant event (SigEvent) for a stream.
    `,
    schema: createEventSchema,
    confirmation: {
      askUser: 'always',
      getConfirmation: async ({ toolParams }) => {
        const title = String(toolParams.title ?? 'Untitled event');
        const verdict = String(toolParams.verdict ?? 'promoted');
        const streamNames = Array.isArray(toolParams.stream_names)
          ? toolParams.stream_names.join(', ')
          : '';

        return {
          title: 'Create Significant Event',
          message: `Create significant event "${title}" (verdict: "${verdict}", streams: "${streamNames}")?`,
          confirm_text: 'Create',
          cancel_text: 'Cancel',
        };
      },
    },
    handler: async (toolParams, context) => {
      const { request } = context;

      try {
        const { eventsClient, licensing, uiSettingsClient } = await getScopedClients({ request });

        await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

        const data = await createEventToolHandler({
          eventsClient,
          eventInput: toolParams,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running event_create: ${message}`);
        if (error instanceof Error) {
          logger.debug(error.stack ?? error.message);
        } else {
          logger.debug(String(error));
        }

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create significant event: ${message}`,
              },
            },
          ],
        };
      }
    },
  };
}
