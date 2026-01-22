/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { validateDuration, validateEsqlQuery } from '../validation';

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

export const createRuleDataSchema = z
  .object({
    name: z.string().min(1).max(64).describe('Human-readable rule name.'),
    tags: z
      .array(z.string().max(64).describe('Rule tag.'))
      .max(100)
      .default([])
      .describe('Tags attached to the rule.'),
    schedule: z
      .object({
        custom: durationSchema.describe('Rule execution interval (e.g. 1m, 5m).'),
      })
      .describe('Schedule configuration for the rule.'),
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
  })
  .strip();
