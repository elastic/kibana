/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const sigEventVerdictSchema = z.enum(['promoted', 'demoted', 'acknowledged']);
export type SigEventVerdict = z.infer<typeof sigEventVerdictSchema>;

export const sigEventEvidenceSchema = z.object({
  stream_name: z.string().describe('Stream name where evidence was collected'),
  rule_name: z.string().describe('Rule name used to identify this evidence'),
  description: z.string().describe('Human-readable description of the evidence'),
  esql_query: z
    .string()
    .describe('Valid ESQL query used to fetch event-related documents for investigation'),
  confirmed: z
    .boolean()
    .describe('Whether the query was executed and confirmed that the issue exists'),
  collected_at: z.string().datetime().describe('When the evidence confirmation was collected'),
  row_count: z
    .number()
    .int()
    .nonnegative()
    .describe('Number of documents signaling the issue for this evidence'),
});

export const sigEventCauseKiSchema = z.object({
  id: z.string().describe('Feature KI identifier'),
  name: z.string().describe('Feature KI name'),
  stream_name: z.string().describe('Stream name associated with the Feature KI'),
});

export const sigEventSchema = z.object({
  id: z.string().describe('Unique identifier of the significant event'),
  verdict: sigEventVerdictSchema.describe('Current promotion status of the significant event'),
  title: z.string().describe('Human readable title of the event'),
  summary: z.string().describe('Human readable short summary of the event'),
  root_cause: z.string().describe('Human readable text describing the root cause of the event'),
  stream_names: z.array(z.string()).describe('List of streams affected by the event'),
  rule_names: z
    .array(z.string())
    .optional()
    .describe('Optional list of rule names used to identify the event'),
  workflow_execution_id: z
    .string()
    .optional()
    .describe('Optional workflow execution identifier that produced this event'),
  criticality: z
    .number()
    .min(0)
    .max(1)
    .describe('0 to 1 value of how critical this event is to the system'),
  evidences: z
    .array(sigEventEvidenceSchema)
    .optional()
    .describe('List of evidence objects with data about the event investigation'),
  impact: z
    .string()
    .describe("Human readable text specifying the event's impact on the user's system"),
  cause_kis: z
    .array(sigEventCauseKiSchema)
    .optional()
    .describe('List of Feature KIs used to derive this event'),
});

export type SigEvent = z.infer<typeof sigEventSchema>;
