/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@kbn/esql-language';
import { z } from '@kbn/zod';

const DURATION_RE = /^(\d+)(ms|s|m|h|d|w)$/;

const durationSchema = z.string().superRefine((value, ctx) => {
  if (!DURATION_RE.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid duration "${value}". Expected format like "5m", "1h", "30s", "250ms"`,
    });
  }
});

const withEsqlValidation = (schema: z.ZodString) =>
  schema.superRefine((query, ctx) => {
    const errors = Parser.parseErrors(query);
    if (errors.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid ES|QL query: ${errors[0].message}`,
      });
    }
  });

const scheduleSchema = z
  .object({
    custom: durationSchema,
  })
  .strict();

export const createRuleDataSchema = z
  .object({
    name: z.string().min(1).max(64),
    tags: z.array(z.string().max(64)).max(100).default([]),
    schedule: scheduleSchema,
    enabled: z.boolean().default(true),
    query: withEsqlValidation(z.string().min(1).max(10000)),
    timeField: z.string().min(1).max(128).default('@timestamp'),
    lookbackWindow: durationSchema,
    groupingKey: z.array(z.string()).max(16).default([]),
  })
  .strip();

export type CreateRuleData = z.infer<typeof createRuleDataSchema>;

export const updateRuleDataSchema = z
  .object({
    name: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    schedule: scheduleSchema.optional(),
    enabled: z.boolean().optional(),
    query: withEsqlValidation(z.string().min(1)).optional(),
    timeField: z.string().min(1).optional(),
    lookbackWindow: durationSchema.optional(),
    groupingKey: z.array(z.string()).optional(),
  })
  .strip();

export type UpdateRuleData = z.infer<typeof updateRuleDataSchema>;
