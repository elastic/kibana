/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import {
  metadataSchema,
  ruleKindSchema,
  scheduleEverySchema,
  esqlQuerySchema,
  groupingSchema,
  stateTransitionSchema,
  recoveryPolicyTypeSchema,
  durationSchema,
  isStateTransitionAllowed,
  isRecoveryPolicyQueryProvided,
} from '@kbn/alerting-v2-schemas';

// ─── Operation schemas ────────────────────────────────────────────────────────
// Field-level schemas are imported from the shared alerting-v2-schemas package
// so that tool-level validation matches the CRUD API constraints.

const metadataPartial = metadataSchema.partial();

export const setMetadataOperationSchema = z.object({
  operation: z.literal('set_metadata'),
  name: metadataPartial.shape.name.describe('Rule name.'),
  description: metadataPartial.shape.description.describe('Human-readable description.'),
  tags: metadataPartial.shape.tags.describe('Tags for categorization.'),
});

export const setKindOperationSchema = z.object({
  operation: z.literal('set_kind'),
  kind: ruleKindSchema.describe('Rule kind.'),
});

export const setScheduleOperationSchema = z.object({
  operation: z.literal('set_schedule'),
  every: scheduleEverySchema.optional().describe('Execution interval, e.g. 1m, 5m.'),
  lookback: durationSchema.optional().describe('Lookback window for the query, e.g. 5m, 1h.'),
});

export const setQueryOperationSchema = z.object({
  operation: z.literal('set_query'),
  base: esqlQuerySchema.describe(
    'Base ES|QL query. Must not include time filters — those are applied automatically via the lookback window.'
  ),
});

export const setGroupingOperationSchema = z.object({
  operation: z.literal('set_grouping'),
  fields: groupingSchema.shape.fields
    .describe('Fields to group alerts by (e.g. ["host.name", "service.name"]).'),
});

const stateTransitionInner = stateTransitionSchema.unwrap().unwrap();

export const setStateTransitionOperationSchema = z.object({
  operation: z.literal('set_state_transition'),
  pending_count: stateTransitionInner.shape.pending_count
    .describe('Consecutive breaches before transitioning to active.'),
  pending_timeframe: stateTransitionInner.shape.pending_timeframe
    .describe('Time window for pending evaluation, e.g. 5m.'),
  recovering_count: stateTransitionInner.shape.recovering_count
    .describe('Consecutive recoveries before transitioning to inactive.'),
  recovering_timeframe: stateTransitionInner.shape.recovering_timeframe
    .describe('Time window for recovering evaluation, e.g. 5m.'),
});

export const setRecoveryPolicyOperationSchema = z.object({
  operation: z.literal('set_recovery_policy'),
  type: recoveryPolicyTypeSchema.describe('Recovery detection type.'),
  query: esqlQuerySchema.optional().describe('Recovery ES|QL query. Required when type is "query".'),
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

// ─── ES|QL query validation ───────────────────────────────────────────────────

interface EsqlColumn {
  name: string;
  type: string;
}

async function validateEsqlQueryAgainstCluster(
  esClient: IScopedClusterClient,
  query: string
): Promise<EsqlColumn[]> {
  try {
    const response = await esClient.asCurrentUser.esql.query({
      query: `${query} | LIMIT 0`,
      format: 'json',
    });
    return (response as { columns?: EsqlColumn[] }).columns ?? [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid ES|QL query: ${message}`);
  }
}

// ─── Execution ────────────────────────────────────────────────────────────────

export const executeRuleOperations = async (
  data: Partial<RuleAttachmentData>,
  operations: RuleOperation[],
  esClient?: IScopedClusterClient
): Promise<Partial<RuleAttachmentData>> => {
  let next = { ...data };
  let lastQueryColumns: EsqlColumn[] | undefined;

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
        if (esClient) {
          lastQueryColumns = await validateEsqlQueryAgainstCluster(esClient, op.base);
        }
        next = {
          ...next,
          evaluation: {
            ...next.evaluation,
            query: { base: op.base },
          },
        };
        break;

      case 'set_grouping': {
        if (lastQueryColumns && lastQueryColumns.length > 0) {
          const columnNames = new Set(lastQueryColumns.map((c) => c.name));
          const missing = op.fields.filter((f) => !columnNames.has(f));
          if (missing.length > 0) {
            throw new Error(
              `Grouping fields not found in query output columns: ${missing.join(', ')}. ` +
                `Available columns: ${[...columnNames].join(', ')}`
            );
          }
        }
        next = {
          ...next,
          grouping: { fields: op.fields },
        };
        break;
      }

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

  if (!isStateTransitionAllowed(next)) {
    throw new Error('state_transition is only allowed when kind is "alert".');
  }

  if (!isRecoveryPolicyQueryProvided(next)) {
    throw new Error('recovery_policy.query.base is required when recovery_policy.type is "query".');
  }

  return next;
};
