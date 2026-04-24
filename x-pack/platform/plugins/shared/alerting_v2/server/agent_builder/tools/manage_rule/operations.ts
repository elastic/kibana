/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';

// ─── Operation schemas ────────────────────────────────────────────────────────

export const setMetadataOperationSchema = z.object({
  operation: z.literal('set_metadata'),
  name: z.string().min(1).max(256).optional().describe('Rule name.'),
  description: z.string().max(1024).optional().describe('Human-readable description.'),
  tags: z.array(z.string()).optional().describe('Tags for categorization.'),
});

export const setKindOperationSchema = z.object({
  operation: z.literal('set_kind'),
  kind: z.enum(['alert', 'signal']).describe('Rule kind.'),
});

export const setScheduleOperationSchema = z.object({
  operation: z.literal('set_schedule'),
  every: z.string().min(1).optional().describe('Execution interval, e.g. 1m, 5m.'),
  lookback: z.string().optional().describe('Lookback window for the query, e.g. 5m, 1h.'),
});

export const setQueryOperationSchema = z.object({
  operation: z.literal('set_query'),
  base: z
    .string()
    .min(1)
    .describe(
      'Base ES|QL query. Must not include time filters — those are applied automatically via the lookback window.'
    ),
});

export const setGroupingOperationSchema = z.object({
  operation: z.literal('set_grouping'),
  fields: z
    .array(z.string().min(1))
    .min(1)
    .describe('Fields to group alerts by (e.g. ["host.name", "service.name"]).'),
});

export const setStateTransitionOperationSchema = z.object({
  operation: z.literal('set_state_transition'),
  pending_count: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Consecutive breaches before transitioning to active.'),
  pending_timeframe: z.string().optional().describe('Time window for pending evaluation, e.g. 5m.'),
  recovering_count: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Consecutive recoveries before transitioning to inactive.'),
  recovering_timeframe: z
    .string()
    .optional()
    .describe('Time window for recovering evaluation, e.g. 5m.'),
});

export const setRecoveryPolicyOperationSchema = z.object({
  operation: z.literal('set_recovery_policy'),
  type: z.enum(['query', 'no_breach']).describe('Recovery detection type.'),
  query: z.string().optional().describe('Recovery ES|QL query. Required when type is "query".'),
});

// ─── Discriminated union ──────────────────────────────────────────────────────

export const ruleOperationSchema = z.discriminatedUnion('operation', [
  setMetadataOperationSchema,
  setKindOperationSchema,
  setScheduleOperationSchema,
  setQueryOperationSchema,
  setGroupingOperationSchema,
  setStateTransitionOperationSchema,
  setRecoveryPolicyOperationSchema,
]);

export type RuleOperation = z.infer<typeof ruleOperationSchema>;

// ─── Execution ────────────────────────────────────────────────────────────────

export const executeRuleOperations = (
  data: Partial<RuleAttachmentData>,
  operations: RuleOperation[]
): Partial<RuleAttachmentData> => {
  let next = { ...data };

  for (const op of operations) {
    switch (op.operation) {
      case 'set_metadata': {
        const mergedName = op.name ?? next.metadata?.name ?? '';
        next = {
          ...next,
          metadata: {
            ...next.metadata,
            name: mergedName,
            ...(op.description !== undefined ? { description: op.description } : {}),
            ...(op.tags !== undefined ? { tags: op.tags } : {}),
          },
        };
        break;
      }

      case 'set_kind':
        next = { ...next, kind: op.kind };
        break;

      case 'set_schedule': {
        const existingEvery = next.schedule?.every ?? '5m';
        next = {
          ...next,
          schedule: {
            ...next.schedule,
            every: op.every ?? existingEvery,
            ...(op.lookback !== undefined ? { lookback: op.lookback } : {}),
          },
        };
        break;
      }

      case 'set_query':
        next = {
          ...next,
          evaluation: {
            ...next.evaluation,
            query: { base: op.base },
          },
        };
        break;

      case 'set_grouping':
        next = {
          ...next,
          grouping: { fields: op.fields },
        };
        break;

      case 'set_state_transition':
        next = {
          ...next,
          state_transition: {
            ...next.state_transition,
            ...(op.pending_count !== undefined ? { pending_count: op.pending_count } : {}),
            ...(op.pending_timeframe !== undefined
              ? { pending_timeframe: op.pending_timeframe }
              : {}),
            ...(op.recovering_count !== undefined ? { recovering_count: op.recovering_count } : {}),
            ...(op.recovering_timeframe !== undefined
              ? { recovering_timeframe: op.recovering_timeframe }
              : {}),
          },
        };
        break;

      case 'set_recovery_policy':
        next = {
          ...next,
          recovery_policy: {
            type: op.type,
            ...(op.type === 'query' && op.query ? { query: { base: op.query } } : {}),
          },
        };
        break;
    }
  }

  return next;
};
