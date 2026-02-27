/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from '@kbn/inference-common';
import { insightCoreSchema, type InsightCore } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import zodToJsonSchema from 'zod-to-json-schema';

export const SUBMIT_INSIGHTS_TOOL_NAME = 'submit_insights';

const insightsToolArgsZodSchema = z.object({
  insights: z.array(insightCoreSchema),
});

export const insightsSchema = zodToJsonSchema(insightsToolArgsZodSchema, {
  $refStrategy: 'none',
}) as unknown as ToolSchema;

export function parseInsightsWithErrors(data: unknown): {
  insights: InsightCore[];
  errors: z.ZodError | null;
} {
  const result = insightsToolArgsZodSchema.safeParse(data);
  if (result.success) {
    return { insights: result.data.insights, errors: null };
  }
  return { insights: [], errors: result.error };
}
