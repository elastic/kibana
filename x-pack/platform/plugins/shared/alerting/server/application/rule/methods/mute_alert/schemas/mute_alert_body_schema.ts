/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { snoozedInstanceConditionSchema } from '../../../schemas/rule_schemas';

const validateMuteAlertBody = (value: {
  expiresAt?: string;
  conditions?: Array<unknown>;
  conditionOperator?: 'any' | 'all';
}) => {
  if (value.conditionOperator !== undefined && value.conditions === undefined) {
    return '[conditionOperator] requires [conditions]';
  }

  if (value.expiresAt === undefined && value.conditions === undefined) {
    return 'either [expiresAt] or [conditions] must be provided';
  }

  if (value.conditions !== undefined && value.conditions.length === 0) {
    return '[conditions] must contain at least one condition';
  }
};

export const muteAlertBodySchema = schema.object(
  {
    expiresAt: schema.maybe(
      schema.string({
        validate: (value) =>
          Number.isNaN(Date.parse(value)) ? 'must be a valid ISO 8601 date string' : undefined,
      })
    ),
    conditions: schema.maybe(schema.arrayOf(snoozedInstanceConditionSchema)),
    conditionOperator: schema.maybe(schema.oneOf([schema.literal('any'), schema.literal('all')])),
  },
  {
    validate: validateMuteAlertBody,
  }
);
