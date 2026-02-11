/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { validateDuration, validateEsqlQuery } from './validation';

/** Primitives */

const durationSchema = z.string().superRefine((value, ctx) => {
  const error = validateDuration(value);
  if (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  }
});

const esqlQuerySchema = z
  .string()
  .min(1)
  .max(10000)
  .superRefine((value, ctx) => {
    const error = validateEsqlQuery(value);
    if (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }
  });

/** Kind */

export const ruleKindSchema = z.enum(['alert', 'signal']).describe('The kind of rule.');

export type RuleKind = z.infer<typeof ruleKindSchema>;

/** Metadata (required) */

const metadataSchema = z
  .object({
    name: z.string().min(1).max(256).describe('Unique rule name/identifier.'),
    owner: z.string().max(256).optional().describe('Owner of the rule.'),
    labels: z.array(z.string().max(64)).max(100).optional().describe('Labels for categorization.'),
    time_field: z
      .string()
      .min(1)
      .max(128)
      .default('@timestamp')
      .describe('Time field used for the lookback window range filter.'),
  })
  .strict()
  .describe('Rule metadata.');

/** Schedule (required) */

const scheduleSchema = z
  .object({
    every: durationSchema.describe('Execution interval, e.g. 1m, 5m.'),
    lookback: durationSchema
      .optional()
      .describe('Lookback window for the query (can also be expressed in ES|QL).'),
  })
  .strict()
  .describe('Execution schedule configuration.');

/** Evaluation (required) */

const evaluationQuerySchema = z
  .object({
    base: esqlQuerySchema.describe('Base ES|QL query.'),
    trigger: z
      .object({
        condition: z.string().min(1).max(5000).describe('Trigger condition (WHERE clause).'),
      })
      .strict()
      .describe('Trigger condition.'),
  })
  .strict();

const evaluationSchema = z
  .object({
    query: evaluationQuerySchema,
  })
  .strict()
  .describe('Detection query configuration.');

/** Recovery policy (optional) */

const recoveryPolicySchema = z
  .object({
    type: z.enum(['query', 'no_breach']).describe('Recovery detection type.'),
    query: z
      .object({
        base: esqlQuerySchema
          .optional()
          .describe('Base ES|QL query for recovery (or reference to evaluation.query.base).'),
        condition: z.string().max(5000).optional().describe('Recovery condition (WHERE clause).'),
      })
      .strict()
      .optional()
      .describe('Recovery query when type is query.'),
  })
  .strict()
  .describe('Recovery detection configuration.');

/** State transition (optional, alert-only) */

const stateTransitionOperatorSchema = z.enum(['AND', 'OR']);

const stateTransitionSchema = z
  .object({
    pending_operator: stateTransitionOperatorSchema
      .optional()
      .describe('How to combine count and timeframe for pending.'),
    pending_count: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Consecutive breaches before active.'),
    pending_timeframe: durationSchema.optional().describe('Time window for pending evaluation.'),
    recovering_operator: stateTransitionOperatorSchema
      .optional()
      .describe('How to combine count and timeframe for recovering.'),
    recovering_count: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Consecutive recoveries before inactive.'),
    recovering_timeframe: durationSchema
      .optional()
      .describe('Time window for recovering evaluation.'),
  })
  .strict()
  .describe('Episode state transition thresholds (alert-only).');

/** Grouping (optional) */

const groupingSchema = z
  .object({
    fields: z
      .array(z.string().max(256))
      .max(16)
      .describe('Fields to group by (convention: use ES|QL GROUP BY fields).'),
  })
  .strict()
  .describe('Grouping configuration.');

/** No data (optional) */

const noDataSchema = z
  .object({
    behavior: z
      .enum(['no_data', 'last_status', 'recover'])
      .optional()
      .describe('Behavior when no data is detected.'),
    timeframe: durationSchema.optional().describe('Time window after which no data is detected.'),
  })
  .strict()
  .describe('No data handling configuration.');

/** Notification policies (optional) */

const notificationPolicyRefSchema = z
  .object({
    ref: z.string().min(1).describe('Reference to notification policy.'),
  })
  .strict();

/** Create rule API schema */

export const createRuleDataSchema = z
  .object({
    kind: ruleKindSchema,
    metadata: metadataSchema,
    schedule: scheduleSchema,
    evaluation: evaluationSchema,
    recovery_policy: recoveryPolicySchema.optional(),
    state_transition: stateTransitionSchema.optional(),
    grouping: groupingSchema.optional(),
    no_data: noDataSchema.optional(),
    notification_policies: z.array(notificationPolicyRefSchema).optional(),
  })
  .strip();

export type CreateRuleData = z.infer<typeof createRuleDataSchema>;

/** Update rule API schema — all fields optional for partial updates */

export const updateRuleDataSchema = z
  .object({
    kind: ruleKindSchema.optional(),
    metadata: metadataSchema.partial().optional(),
    schedule: scheduleSchema.partial().optional(),
    evaluation: z
      .object({
        query: z
          .object({
            base: esqlQuerySchema.optional(),
            trigger: z
              .object({
                condition: z.string().min(1).max(5000).optional(),
              })
              .strict()
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    recovery_policy: recoveryPolicySchema.optional().nullable(),
    state_transition: stateTransitionSchema.optional().nullable(),
    grouping: groupingSchema.optional().nullable(),
    no_data: noDataSchema.optional().nullable(),
    notification_policies: z.array(notificationPolicyRefSchema).optional().nullable(),
  })
  .strip();

export type UpdateRuleData = z.infer<typeof updateRuleDataSchema>;
