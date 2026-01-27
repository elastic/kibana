/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import zodToJsonSchema from 'zod-to-json-schema';
import type { Insight } from '@kbn/streams-schema';

export const SUBMIT_INSIGHTS_TOOL_NAME = 'submit_insights';

const insightEvidenceZodSchema = z.object({
  streamName: z.string().describe('The name of the stream where this evidence was found'),
  queryTitle: z.string().describe('The title of the query that detected these events'),
  featureName: z
    .string()
    .optional()
    .describe('The system or feature the query was generated for (e.g., kubernetes, nginx)'),
  eventCount: z.number().describe('Number of events detected by this query'),
});

const insightZodSchema = z.object({
  title: z.string().describe('Short, actionable title summarizing the insight'),
  description: z.string().describe('Detailed explanation of what is happening and why it matters'),
  impact: z
    .enum(['critical', 'high', 'medium', 'low'])
    .describe(
      'Severity level: critical (service down), high (degraded), medium (potential issue), low (informational)'
    ),
  evidence: z
    .array(insightEvidenceZodSchema)
    .describe('Evidence supporting this insight from streams and queries'),
  recommendations: z
    .array(z.string())
    .describe('Actionable steps to investigate or resolve the issue'),
});

const insightsToolArgsZodSchema = z.object({
  insights: z.array(insightZodSchema),
});

export const insightsSchema = zodToJsonSchema(insightsToolArgsZodSchema, {
  $refStrategy: 'none',
}) as unknown as ToolSchema;

export function parseInsightsWithErrors(data: unknown): {
  insights: Insight[];
  errors: z.ZodError | null;
} {
  const result = insightsToolArgsZodSchema.safeParse(data);
  if (result.success) {
    return { insights: result.data.insights, errors: null };
  }
  return { insights: [], errors: result.error };
}
