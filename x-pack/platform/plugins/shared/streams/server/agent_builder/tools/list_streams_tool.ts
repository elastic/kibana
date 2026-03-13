/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { assertSignificantEventsAccess } from '../../routes/utils/assert_significant_events_access';
import { SIG_EVENTS_TOOL_IDS } from './constants';
import type { SigEventsToolsDeps } from './types';

const listStreamsSchema = z.object({});

export const createListStreamsTool = ({
  getScopedClients,
  server,
}: SigEventsToolsDeps): BuiltinToolDefinition<typeof listStreamsSchema> => ({
  id: SIG_EVENTS_TOOL_IDS.listStreams,
  type: ToolType.builtin,
  description: `List all Streams the user has access to. Use this to discover stream names when the user refers to "my stream", "streams", or when you need to scope other Sig Events tools by stream.`,
  schema: listStreamsSchema,
  tags: ['streams', 'sig-events'],
  handler: async (_params, { request }) => {
    const { streamsClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const streams = await streamsClient.listStreams();

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            streams: streams.map((s) => ({ name: s.name })),
            total: streams.length,
          },
        },
      ],
    };
  },
});
