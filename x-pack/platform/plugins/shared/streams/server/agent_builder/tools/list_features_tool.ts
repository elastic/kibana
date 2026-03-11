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

const listFeaturesSchema = z.object({
  stream_names: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of stream names to filter features. If omitted, returns features for all streams the user has access to.'
    ),
});

export const createListFeaturesTool = ({
  getScopedClients,
  server,
}: SigEventsToolsDeps): BuiltinToolDefinition<typeof listFeaturesSchema> => ({
  id: SIG_EVENTS_TOOL_IDS.listFeatures,
  type: ToolType.builtin,
  description: `List features (identified patterns or entities) for Streams. Can list globally or filter by stream names. Features are used for significant events discovery.`,
  schema: listFeaturesSchema,
  tags: ['streams', 'sig-events', 'features'],
  handler: async ({ stream_names: streamNames }, { request }) => {
    const { featureClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const streams =
      streamNames && streamNames.length > 0
        ? (await streamsClient.listStreams()).filter((s) => streamNames.includes(s.name))
        : await streamsClient.listStreams();
    const names = streams.map((s) => s.name);

    if (names.length === 0) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: { features: [], total: 0 },
          },
        ],
      };
    }

    const { hits: features, total } = await featureClient.getAllFeatures(names);

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            features: features.map((f) => ({
              id: f.id,
              title: f.title,
              type: f.type,
              stream_name: f.stream_name,
            })),
            total,
          },
        },
      ],
    };
  },
});
