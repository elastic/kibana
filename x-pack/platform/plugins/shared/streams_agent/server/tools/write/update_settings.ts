/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { Streams } from '@kbn/streams-schema';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';
import { buildUpsertRequest } from './build_upsert_request';

export const STREAMS_UPDATE_SETTINGS_TOOL_ID = 'streams.update_settings';

const updateSettingsSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to update'),
  description: z.string().optional().describe('A new description for the stream'),
});

export function createUpdateSettingsTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof updateSettingsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof updateSettingsSchema> = {
    id: STREAMS_UPDATE_SETTINGS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Updates the description for a stream. IMPORTANT: Always preview and get user confirmation before calling.',
    tags: ['streams'],
    schema: updateSettingsSchema,
    handler: async (toolParams, context) => {
      const { name, description } = toolParams;
      const { request, logger } = context;
      try {
        const { streamsClient } = await getScopedStreamsClients({ core, request });

        const stream = await streamsClient.getStream(name);
        if (
          !Streams.WiredStream.Definition.is(stream) &&
          !Streams.ClassicStream.Definition.is(stream)
        ) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: 'Settings can only be updated on ingest streams (wired or classic).',
                },
              },
            ],
          };
        }

        const upsertRequest = buildUpsertRequest(stream, {
          ...(description !== undefined ? { description } : {}),
        });
        await streamsClient.upsertStream({ name, request: upsertRequest });

        const changedSettings = [];
        if (description !== undefined) changedSettings.push('description');

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Successfully updated settings for stream "${name}": ${changedSettings.join(
                  ', '
                )}`,
                stream: name,
                updatedSettings: changedSettings,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.update_settings tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to update settings for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
