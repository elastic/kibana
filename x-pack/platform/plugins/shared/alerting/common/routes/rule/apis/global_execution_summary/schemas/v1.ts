/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const getGlobalExecutionSummarySchema = schema.object(
  {
    date_start: schema.string(),
    date_end: schema.string(),
  },
  {
    validate({ date_start: start, date_end: end }) {
      const parsedStart = Date.parse(start);
      if (isNaN(parsedStart)) {
        return `[start]: query start must be valid date`;
      }

      const parsedEnd = Date.parse(end);
      if (isNaN(parsedEnd)) {
        return `[end]: query end must be valid date`;
      }

      if (parsedStart >= parsedEnd) {
        return `[start]: query start must be before end`;
      }
    },
  }
);

const positiveNumber = schema.number({ min: 0 });

export const getGlobalExecutionSummaryResponseBodySchema = schema.object({
  executions: schema.object({
    total: positiveNumber,
    success: positiveNumber,
  }),
  latestExecutionSummary: schema.object({
    success: positiveNumber,
    failure: positiveNumber,
    warning: positiveNumber,
  }),
});
