/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid ISO date string.',
});

const dateRangeSchema = z
  .object({
    start: isoDateString,
    end: isoDateString,
  })
  .refine(
    (data) => {
      const start = new Date(data.start).getTime();
      const now = Date.now();

      return start <= now;
    },
    {
      message: 'start cannot be in the future.',
    }
  )
  .refine(
    (data) => {
      const end = new Date(data.end).getTime();
      const now = Date.now();

      return end <= now;
    },
    {
      message: 'end cannot be in the future.',
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.start).getTime();
      const end = new Date(data.end).getTime();

      return end - start >= FIVE_MINUTES_MS;
    },
    {
      message: 'end must be at least 5 minutes after start date.',
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.start).getTime();
      const end = new Date(data.end).getTime();

      return end - start <= NINETY_DAYS_MS;
    },
    {
      message: 'The date range must not exceed 90 days.',
    }
  );

export const bulkFillGapsByRuleIdParamsSchema = dateRangeSchema;
