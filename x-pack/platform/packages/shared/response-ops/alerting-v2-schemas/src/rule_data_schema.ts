/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { validateDuration, validateEsqlQuery } from './validation';

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

const scheduleSchema = z
  .object({
    custom: durationSchema.describe('Rule execution interval (e.g. 1m, 5m).'),
  })
  .strict()
  .describe('Schedule configuration for the rule.');

export const ruleKindSchema = z.enum(['alert', 'signal']).describe('The kind of rule.');

export type RuleKind = z.infer<typeof ruleKindSchema>;

const stateTransitionOperatorSchema = z
  .enum(['AND', 'OR'])
  .describe('How to combine count and timeframe thresholds.');

const stateTransitionSchema = z
  .object({
    pendingOperator: stateTransitionOperatorSchema
      .optional()
      .describe('How to combine count and timeframe for pending.'),
    pendingCount: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Number of consecutive breaches before transitioning to active. Zero moves directly to active.'
      ),
    pendingTimeframe: durationSchema.optional().describe('Time window for pending evaluation.'),
    recoveringOperator: stateTransitionOperatorSchema
      .optional()
      .describe('How to combine count and timeframe for recovering.'),
    recoveringCount: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Number of consecutive recoveries before transitioning to inactive. Zero moves directly to inactive.'
      ),
    recoveringTimeframe: durationSchema
      .optional()
      .describe('Time window for recovering evaluation.'),
  })
  .strict()
  .nullable()
  .optional()
  .describe('Controls episode state transition thresholds for alert rules. Set to null to remove.');

export type StateTransition = z.infer<typeof stateTransitionSchema>;

export const createRuleDataSchema = z
  .object({
    name: z.string().min(1).max(64).describe('Human-readable rule name.'),
    kind: ruleKindSchema,
    tags: z
      .array(z.string().max(64).describe('Rule tag.'))
      .max(100)
      .default([])
      .describe('Tags attached to the rule.'),
    schedule: scheduleSchema,
    enabled: z.boolean().default(true).describe('Whether the rule is enabled.'),
    query: esqlQuerySchema.describe('ES|QL query text to execute.'),
    timeField: z
      .string()
      .min(1)
      .max(128)
      .default('@timestamp')
      .describe('Time field to apply the lookback window to.'),
    lookbackWindow: durationSchema.describe('Lookback window for the query (e.g. 5m, 1h).'),
    groupingKey: z
      .array(z.string())
      .max(16)
      .default([])
      .describe('Fields to group alert events by.'),
    stateTransition: stateTransitionSchema,
  })
  .strip()
  .refine((data) => !(data.kind !== 'alert' && data.stateTransition != null), {
    message: 'stateTransition is only allowed when kind is "alert".',
    path: ['stateTransition'],
  });

export type CreateRuleData = z.infer<typeof createRuleDataSchema>;

export const updateRuleDataSchema = z
  .object({
    name: z.string().min(1).max(64).optional().describe('Human-readable rule name.'),
    tags: z.array(z.string().max(64)).max(100).optional().describe('Tags attached to the rule.'),
    schedule: scheduleSchema.optional(),
    enabled: z.boolean().optional().describe('Whether the rule is enabled.'),
    query: esqlQuerySchema.optional().describe('ES|QL query text to execute.'),
    timeField: z
      .string()
      .min(1)
      .max(128)
      .optional()
      .describe('Time field to apply the lookback window to.'),
    lookbackWindow: durationSchema
      .optional()
      .describe('Lookback window for the query (e.g. 5m, 1h).'),
    groupingKey: z
      .array(z.string())
      .max(16)
      .optional()
      .describe('Fields to group alert events by.'),
    stateTransition: stateTransitionSchema,
  })
  .strip();

export type UpdateRuleData = z.infer<typeof updateRuleDataSchema>;
