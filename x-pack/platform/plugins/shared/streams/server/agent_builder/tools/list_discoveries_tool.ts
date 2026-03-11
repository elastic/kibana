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

const listDiscoveriesSchema = z.object({
  stream_names: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of stream names (impacted streams). If provided, only returns discoveries (insights) that have evidence from at least one of these streams. If omitted, returns all discoveries.'
    ),
});

export const createListDiscoveriesTool = ({
  getScopedClients,
  server,
}: SigEventsToolsDeps): BuiltinToolDefinition<typeof listDiscoveriesSchema> => ({
  id: SIG_EVENTS_TOOL_IDS.listDiscoveries,
  type: ToolType.builtin,
  description: `List Discoveries (insights) — high-level findings generated from significant events across streams. Can list globally or filter by impacted stream names (insights that mention those streams in their evidence).`,
  schema: listDiscoveriesSchema,
  tags: ['streams', 'sig-events', 'discoveries', 'insights'],
  handler: async ({ stream_names: streamNames }, { request }) => {
    const { insightClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { insights } = await insightClient.list();

    const filtered =
      streamNames && streamNames.length > 0
        ? insights.filter((insight) =>
            insight.evidence?.some((e) => streamNames.includes(e.stream_name))
          )
        : insights;

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            discoveries: filtered.map((d) => ({
              id: d.id,
              title: d.title,
              description: d.description,
              impact: d.impact,
              evidence_streams: [...new Set(d.evidence?.map((e) => e.stream_name) ?? [])],
            })),
            total: filtered.length,
          },
        },
      ],
    };
  },
});
