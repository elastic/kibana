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
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import type { StreamsServer } from '../../../types';
import { demoteEventToolHandler } from './handler';

export const STREAMS_DEMOTE_EVENT_TOOL_ID = 'platform.streams.sig_events.event_demote';

const demoteEventSchema = z.object({
  event_id: z.string().describe('Identifier of the significant event to demote.'),
});

export function createDemoteEventTool({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): BuiltinSkillBoundedTool<typeof demoteEventSchema> {
  return {
    id: STREAMS_DEMOTE_EVENT_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      Demote an existing significant event.

      Use this when an event is no longer incident-worthy or should be deprioritized.
    `,
    schema: demoteEventSchema,
    handler: async (toolParams, context) => {
      const { request } = context;

      try {
        const { eventsClient, licensing, uiSettingsClient } = await getScopedClients({ request });

        await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

        const data = await demoteEventToolHandler({
          eventsClient,
          eventId: toolParams.event_id,
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
        logger.error(`Error running event_demote: ${message}`);
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
                message: `Failed to demote significant event: ${message}`,
              },
            },
          ],
        };
      }
    },
  };
}
