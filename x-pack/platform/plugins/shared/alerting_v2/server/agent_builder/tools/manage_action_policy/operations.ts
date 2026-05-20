/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ActionPolicyAttachmentData } from '@kbn/alerting-v2-schemas';
import {
  actionPolicyDestinationSchema,
  createActionPolicyDataSchema,
  groupingModeSchema,
  throttleStrategySchema,
  durationSchema,
  tagsSchema,
  actionPolicyTypeAndRuleIdSchema,
  PER_EPISODE_STRATEGIES,
  AGGREGATE_STRATEGIES,
  STRATEGIES_REQUIRING_INTERVAL,
} from '@kbn/alerting-v2-schemas';
import { attachmentDataToActionPolicyPayload } from '../../../../common/agent_builder/action_policy_mappers';

// ─── Operation schemas ────────────────────────────────────────────────────────
// Derived from shared alerting-v2-schemas so tool-level validation stays
// in sync with the CRUD API constraints automatically.

export const setMetadataOperationSchema = z.object({
  operation: z.literal('set_metadata'),
  name: z.string().min(1).max(256).optional().describe('The action policy name.'),
  description: z.string().max(1024).optional().describe('A description of the action policy.'),
  tags: tagsSchema.optional().describe('Tags for categorizing the action policy.'),
});

export const setDestinationsOperationSchema = z.object({
  operation: z.literal('set_destinations'),
  destinations: z
    .array(actionPolicyDestinationSchema)
    .min(1, 'At least one destination must be provided')
    .max(10)
    .describe('The list of workflow destinations.'),
});

export const setMatcherOperationSchema = z.object({
  operation: z.literal('set_matcher'),
  matcher: z
    .string()
    .max(4096)
    .nullable()
    .describe('A KQL query to match alert episodes, or null for a catch-all.'),
});

export const setGroupingOperationSchema = z.object({
  operation: z.literal('set_grouping'),
  groupingMode: groupingModeSchema.optional().describe('The grouping mode.'),
  groupBy: z
    .array(z.string().min(1).max(256))
    .max(10)
    .optional()
    .nullable()
    .describe('Fields used to group alerts (required when groupingMode is per_field).'),
});

export const setThrottleOperationSchema = z.object({
  operation: z.literal('set_throttle'),
  strategy: throttleStrategySchema.optional().describe('The throttle strategy.'),
  interval: durationSchema.optional().describe('The throttle interval (e.g. 5m, 1h).'),
});

export const setTypeOperationSchema = actionPolicyTypeAndRuleIdSchema.extend({
  operation: z.literal('set_type'),
});

export const validateOperationSchema = z.object({
  operation: z.literal('validate'),
});

// ─── Discriminated union ──────────────────────────────────────────────────────

export const actionPolicyOperationSchema = z.discriminatedUnion('operation', [
  setMetadataOperationSchema,
  setDestinationsOperationSchema,
  setMatcherOperationSchema,
  setGroupingOperationSchema,
  setThrottleOperationSchema,
  setTypeOperationSchema,
  validateOperationSchema,
]);

export type ActionPolicyOperation = z.infer<typeof actionPolicyOperationSchema>;

// ─── Validation errors ────────────────────────────────────────────────────────

export class ActionPolicyOperationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionPolicyOperationValidationError';
  }
}

// ─── Throttle / grouping compatibility ────────────────────────────────────────

function validateThrottleGroupingCompat(
  groupingMode: string | undefined | null,
  strategy: string | undefined,
  interval: string | null | undefined
): void {
  if (!strategy) return;

  const mode = groupingMode ?? 'per_episode';
  const allowed = mode === 'per_episode' ? PER_EPISODE_STRATEGIES : AGGREGATE_STRATEGIES;
  if (!allowed.has(strategy)) {
    throw new ActionPolicyOperationValidationError(
      `Throttle strategy "${strategy}" is not valid for grouping mode "${mode}". ` +
        `Allowed strategies: ${[...allowed].join(', ')}`
    );
  }

  if (STRATEGIES_REQUIRING_INTERVAL.has(strategy) && !interval) {
    throw new ActionPolicyOperationValidationError(
      `Throttle strategy "${strategy}" requires an interval to be defined.`
    );
  }
}

// ─── Execution ────────────────────────────────────────────────────────────────

export const executeActionPolicyOperations = (
  data: Partial<ActionPolicyAttachmentData>,
  operations: ActionPolicyOperation[],
  { isNew = false }: { isNew?: boolean } = {}
): Partial<ActionPolicyAttachmentData> => {
  let next = { ...data };

  for (const op of operations) {
    switch (op.operation) {
      case 'set_metadata': {
        const mergedName = op.name ?? next.name ?? '';
        next = {
          ...next,
          name: mergedName,
          ...(op.description !== undefined ? { description: op.description } : {}),
          ...(op.tags !== undefined ? { tags: op.tags } : {}),
        };
        break;
      }

      case 'set_destinations':
        next = { ...next, destinations: op.destinations };
        break;

      case 'set_matcher':
        next = { ...next, matcher: op.matcher };
        break;

      case 'set_grouping': {
        if (op.groupingMode === 'per_field' && (!op.groupBy || op.groupBy.length === 0)) {
          throw new ActionPolicyOperationValidationError(
            'groupBy fields are required when groupingMode is "per_field".'
          );
        }
        next = {
          ...next,
          ...(op.groupingMode !== undefined ? { groupingMode: op.groupingMode } : {}),
          ...(op.groupBy !== undefined ? { groupBy: op.groupBy } : {}),
        };
        break;
      }

      case 'set_throttle':
        next = {
          ...next,
          throttle: {
            ...next.throttle,
            ...(op.strategy !== undefined ? { strategy: op.strategy } : {}),
            ...(op.interval !== undefined ? { interval: op.interval ?? null } : { interval: null }),
          },
        };
        break;

      case 'set_type':
        next = {
          ...next,
          type: op.type,
          ruleId: op.type === 'single_rule' ? op.ruleId : null,
        };
        break;

      case 'validate': {
        const payload = attachmentDataToActionPolicyPayload(next);
        const result = createActionPolicyDataSchema.safeParse(payload);
        if (!result.success) {
          const issues = result.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('\n');
          throw new ActionPolicyOperationValidationError(
            `Action policy is not ready to save:\n${issues}`
          );
        }
        break;
      }
    }
  }

  if (isNew && !next.name) {
    throw new ActionPolicyOperationValidationError(
      'A name is required when creating a new action policy. Use a set_metadata operation with a name.'
    );
  }

  validateThrottleGroupingCompat(
    next.groupingMode,
    next.throttle?.strategy,
    next.throttle?.interval
  );

  return next;
};
