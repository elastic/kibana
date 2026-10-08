/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type {
  ActionPolicyAttachmentData,
  ActionPolicyGrouping,
  GroupingMode,
  ThrottleStrategy,
} from '@kbn/alerting-v2-schemas';
import {
  actionPolicyDestinationSchema,
  createActionPolicyDataSchema,
  groupingModeSchema,
  throttleStrategySchema,
  durationSchema,
  policyMatcherSchema,
  needsInterval,
  PER_ALERT_STRATEGIES,
  AGGREGATE_STRATEGIES,
  STRATEGIES_REQUIRING_INTERVAL,
} from '@kbn/alerting-v2-schemas';
import { attachmentDataToActionPolicyPayload } from '@kbn/alerting-v2-utils';

// ─── Operation schemas ────────────────────────────────────────────────────────
// Derived from shared alerting-v2-schemas so tool-level validation stays
// in sync with the CRUD API constraints automatically.

export const setMetadataOperationSchema = z
  .object({
    operation: z.literal('set_metadata'),
    name: z.string().min(1).max(256).optional().describe('The action policy name.'),
    description: z.string().max(1024).optional().describe('A description of the action policy.'),
  })
  .describe('Use `set_metadata` to name the action policy and add a description.');

export const setDestinationsOperationSchema = z
  .object({
    operation: z.literal('set_destinations'),
    destinations: z
      .array(actionPolicyDestinationSchema)
      .min(1, 'At least one destination must be provided')
      .max(10)
      .describe('The list of workflow destinations.'),
  })
  .describe(
    'Use `set_destinations` to choose which workflows receive notifications (email, Slack, PagerDuty, etc.).'
  );

export const setMatcherOperationSchema = z
  .object({
    operation: z.literal('set_matcher'),
    matcher: policyMatcherSchema
      .nullable()
      .describe('Structured matcher for alerts, or null for a catch-all.'),
  })
  .describe(
    'Use `set_matcher` to limit which alerts this policy notifies on. A null matcher matches all alerts in the space; an empty matcher is rejected, so use null instead.'
  );

export const setGroupingOperationSchema = z
  .object({
    operation: z.literal('set_grouping'),
    groupingMode: groupingModeSchema.optional().describe('The grouping mode.'),
    groupBy: z
      .array(z.string().min(1).max(256))
      .max(10)
      .optional()
      .nullable()
      .describe(
        'Fields used to group alerts. Required by `per_field`, and rejected by the other modes, which group on no field.'
      ),
  })
  .describe(
    'Use `set_grouping` to batch matched alerts into notifications — one per alert (`per_alert`), one for all matching alerts, or grouped by field.'
  );

export const setThrottleOperationSchema = z
  .object({
    operation: z.literal('set_throttle'),
    strategy: throttleStrategySchema.optional().describe('The throttle strategy.'),
    interval: durationSchema
      .optional()
      .describe(
        'The throttle interval (e.g. 5m, 1h). Required by `per_status_interval` and `time_interval`, and rejected by the other strategies, which do not notify on a schedule.'
      ),
  })
  .describe(
    'Use `set_throttle` to limit how often notifications fire so the user is not flooded by repeat alerts.'
  );

export const validateOperationSchema = z
  .object({
    operation: z.literal('validate'),
  })
  .describe(
    'Use `validate` as the last operation to confirm the action policy is complete and ready to save.'
  );

// ─── Discriminated union ──────────────────────────────────────────────────────

export const actionPolicyOperationSchema = z.discriminatedUnion('operation', [
  setMetadataOperationSchema,
  setDestinationsOperationSchema,
  setMatcherOperationSchema,
  setGroupingOperationSchema,
  setThrottleOperationSchema,
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
  strategy: string | undefined
): void {
  if (!strategy) return;

  const mode = groupingMode ?? 'per_alert';
  const allowed = mode === 'per_alert' ? PER_ALERT_STRATEGIES : AGGREGATE_STRATEGIES;
  if (!allowed.has(strategy)) {
    throw new ActionPolicyOperationValidationError(
      `Throttle strategy "${strategy}" is not valid for grouping mode "${mode}". ` +
        `Allowed strategies: ${[...allowed].join(', ')}`
    );
  }
}

type ThrottleDraft = NonNullable<ActionPolicyAttachmentData['throttle']>;

/**
 * Builds the throttle variant the strategy names. An interval carries over only to a strategy that
 * uses one, so switching to an intervalless strategy needs no extra operation; one the agent spells
 * out for such a strategy is an error rather than a value the server would have to discard.
 */
/**
 * Builds the grouping variant the mode names. Fields carry over only to the mode that groups on
 * them, so switching away from `per_field` needs no extra operation; fields the agent spells out
 * for another mode are an error rather than a value the server would have to discard.
 */
function buildGroupingDraft(
  mode: GroupingMode,
  explicitFields: string[] | undefined | null,
  stored: ActionPolicyGrouping | undefined
): ActionPolicyGrouping {
  if (mode !== 'per_field') {
    if (explicitFields?.length) {
      throw new ActionPolicyOperationValidationError(
        `Grouping mode "${mode}" does not group on fields. Omit groupBy, or use "per_field".`
      );
    }
    return { mode };
  }

  const fields = explicitFields ?? (stored?.mode === 'per_field' ? stored.fields : undefined);

  if (!fields?.length) {
    throw new ActionPolicyOperationValidationError(
      'groupBy fields are required when groupingMode is "per_field".'
    );
  }

  return { mode, fields };
}

function buildThrottleDraft(
  strategy: ThrottleStrategy,
  explicitInterval: string | undefined,
  stored: ThrottleDraft | undefined
): ThrottleDraft {
  if (!needsInterval(strategy)) {
    if (explicitInterval !== undefined) {
      throw new ActionPolicyOperationValidationError(
        `Throttle strategy "${strategy}" does not take an interval. Omit it, or use one of: ` +
          `${[...STRATEGIES_REQUIRING_INTERVAL].join(', ')}.`
      );
    }
    return { strategy };
  }

  const interval =
    explicitInterval ?? (stored && 'interval' in stored ? stored.interval : undefined);

  if (!interval) {
    throw new ActionPolicyOperationValidationError(
      `Throttle strategy "${strategy}" requires an interval to be defined.`
    );
  }

  return { strategy, interval };
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
        };
        break;
      }

      case 'set_destinations':
        next = { ...next, destinations: op.destinations };
        break;

      case 'set_matcher':
        next = { ...next, matcher: op.matcher ?? undefined };
        break;

      case 'set_grouping': {
        const mode = op.groupingMode ?? next.grouping?.mode ?? 'per_alert';
        next = { ...next, grouping: buildGroupingDraft(mode, op.groupBy, next.grouping) };
        break;
      }

      case 'set_throttle': {
        const strategy = op.strategy ?? next.throttle?.strategy;
        if (strategy === undefined) {
          throw new ActionPolicyOperationValidationError(
            'strategy is required when the policy has no throttle yet.'
          );
        }
        next = {
          ...next,
          throttle: buildThrottleDraft(strategy, op.interval, next.throttle),
        };
        break;
      }

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

  validateThrottleGroupingCompat(next.grouping?.mode, next.throttle?.strategy);

  return next;
};
