/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { MAX_ID_LENGTH, MAX_TEXT_LENGTH, MAX_TITLE_LENGTH } from '@kbn/significant-events-schema';
import { z } from '@kbn/zod/v4';

export const WRITE_QUERIES_TOOL_ID = 'platform_sig_events_ki_queries_write';

const MAX_QUERIES_PER_CALL = 100;
const MAX_FEATURES_PER_QUERY = 100;

const acceptedQuerySchema = z.object({
  type: z.enum(['match', 'stats']),
  esql: z.object({ query: z.string().max(MAX_TEXT_LENGTH) }),
  title: z.string().max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_TEXT_LENGTH),
  category: z.enum(['operational', 'configuration', 'resource_health', 'error', 'security']),
  severity_score: z.number().min(0).max(100),
  evidence: z.array(z.string().max(MAX_TEXT_LENGTH)).max(100).optional(),
  replaces: z.string().max(MAX_ID_LENGTH).optional(),
  features: z
    .array(
      z.object({
        id: z.string().max(MAX_ID_LENGTH),
        run_id: z.string().max(MAX_ID_LENGTH).optional(),
      })
    )
    .min(1)
    .max(MAX_FEATURES_PER_QUERY),
});

export type AcceptedQuery = z.infer<typeof acceptedQuerySchema>;

const writeQueriesSchema = z.object({
  queries: z
    .array(acceptedQuerySchema)
    .max(MAX_QUERIES_PER_CALL)
    .describe(
      'Final accepted queries from validate_queries. Submit exactly once after all self-correction rounds are complete. Pass an empty array when no queries are justified by the evidence.'
    ),
});

export const writeQueriesTool: BuiltinSkillBoundedTool<typeof writeQueriesSchema> = {
  id: WRITE_QUERIES_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Submit the final validated query batch exactly once after all self-correction rounds are complete. Pass the accepted_queries returned by the last successful validate_queries call, or an empty array when no queries are justified by the evidence.',
  schema: writeQueriesSchema,
  handler: ({ queries }) => ({
    results: [{ type: ToolResultType.other, data: { written: true, count: queries.length } }],
  }),
};
