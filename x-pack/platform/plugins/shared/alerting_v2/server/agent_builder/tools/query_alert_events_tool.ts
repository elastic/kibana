/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';

const queryAlertEventsSchema = z.object({
  start: z
    .string()
    .describe(
      'Start of the time range in ISO 8601 or date math format (e.g. "now-1h", "2026-01-01T00:00:00Z").'
    ),
  end: z.string().optional().describe('End of the time range. Defaults to "now".'),
  ruleId: z
    .string()
    .optional()
    .describe('Optional rule ID to filter alert events for a specific rule.'),
  status: z
    .enum(['active', 'pending', 'recovering', 'inactive'])
    .optional()
    .describe('Optional episode status filter.'),
  limit: z.number().optional().describe('Maximum number of results to return. Defaults to 50.'),
});

export const queryAlertEventsTool = (): BuiltinToolDefinition<typeof queryAlertEventsSchema> => ({
  id: `${internalNamespaces.alertingV2}.query_alert_events`,
  type: ToolType.builtin,
  description:
    'Query the alert events data stream to retrieve recent alert firings, recoveries, and episode state. ' +
    'Useful for investigating what alerts fired, their timeline, and episode lifecycle.',
  tags: ['alerting'],
  schema: queryAlertEventsSchema,
  handler: async ({ start, end, ruleId, status, limit }, { esClient }) => {
    const effectiveEnd = end ?? 'now';
    const effectiveLimit = limit ?? 50;

    let query = `FROM $.alerting-events | WHERE @timestamp >= "${start}" AND @timestamp <= "${effectiveEnd}"`;

    if (ruleId) {
      query += ` AND rule.id == "${ruleId}"`;
    }
    if (status) {
      query += ` AND episode.status == "${status}"`;
    }

    query += ` | SORT @timestamp DESC | LIMIT ${effectiveLimit}`;

    const result = await esClient.asCurrentUser.transport.request<{
      columns: Array<{ name: string; type: string }>;
      values: unknown[][];
    }>({
      method: 'POST',
      path: '/_query',
      body: { query },
    });

    return {
      results: [
        {
          type: ToolResultType.esqlResults,
          data: {
            query,
            columns: result.columns,
            values: result.values,
          },
        },
      ],
    };
  },
});
