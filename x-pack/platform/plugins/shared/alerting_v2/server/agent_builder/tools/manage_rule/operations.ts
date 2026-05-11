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
  scheduleSchema,
  evaluationQuerySchema,
  groupingSchema,
  stateTransitionSchema,
  recoveryPolicySchema,
  isStateTransitionAllowed,
  isRecoveryPolicyQueryProvided,
} from '@kbn/alerting-v2-schemas';

// ─── Operation schemas ────────────────────────────────────────────────────────
// Every field-level schema is derived from the shared alerting-v2-schemas
// parent objects (via .shape / .unwrap()) so that tool-level validation
// stays in sync with the CRUD API constraints automatically.

export const setMetadataOperationSchema = metadataSchema
  .partial()
  .omit({ owner: true })
  .extend({ operation: z.literal('set_metadata') });

export const setKindOperationSchema = z.object({
  operation: z.literal('set_kind'),
  kind: ruleKindSchema,
});

export const setScheduleOperationSchema = scheduleSchema
  .partial()
  .extend({ operation: z.literal('set_schedule') });

export const setQueryOperationSchema = evaluationQuerySchema.extend({
  operation: z.literal('set_query'),
});

export const setGroupingOperationSchema = groupingSchema.extend({
  operation: z.literal('set_grouping'),
});

export const setStateTransitionOperationSchema = stateTransitionSchema
  .unwrap()
  .unwrap()
  .omit({ pending_operator: true, recovering_operator: true })
  .extend({ operation: z.literal('set_state_transition') });

export const setRecoveryPolicyOperationSchema = recoveryPolicySchema.extend({
  operation: z.literal('set_recovery_policy'),
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

// ─── Validation errors ────────────────────────────────────────────────────────

/**
 * Thrown for user/agent-input validation failures (invalid ES|QL, unknown grouping
 * field, missing required fields). Distinguished from unexpected errors so the
 * caller can log them at a lower severity.
 */
export class RuleOperationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleOperationValidationError';
  }
}

// ─── ES|QL query validation ───────────────────────────────────────────────────

interface EsqlColumn {
  name: string;
  type: string;
}

/**
 * Executes the query with `| LIMIT 0` appended to catch semantic errors
 * (unknown index, invalid field, etc.) without returning rows.
 * Returns the column metadata so downstream operations (e.g. set_grouping)
 * can validate field references against actual query output.
 */
async function validateEsqlQuery(
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
    throw new RuleOperationValidationError(`Invalid ES|QL query: ${message}`);
  }
}

// ─── Execution ────────────────────────────────────────────────────────────────

export const executeRuleOperations = async (
  data: Partial<RuleAttachmentData>,
  operations: RuleOperation[],
  esClient?: IScopedClusterClient,
  { isNew = false }: { isNew?: boolean } = {}
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
          lastQueryColumns = await validateEsqlQuery(esClient, op.base);
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
            throw new RuleOperationValidationError(
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
            ...(op.query ? { query: op.query } : {}),
          },
        };
        break;
    }
  }

  if (isNew && !next.metadata?.name) {
    throw new RuleOperationValidationError(
      'A rule name is required when creating a new rule. Use a set_metadata operation with a name.'
    );
  }

  if (!isStateTransitionAllowed(next)) {
    throw new RuleOperationValidationError(
      'state_transition is only allowed when kind is "alert".'
    );
  }

  if (!isRecoveryPolicyQueryProvided(next)) {
    throw new RuleOperationValidationError(
      'recovery_policy.query.base is required when recovery_policy.type is "query".'
    );
  }

  return next;
};
