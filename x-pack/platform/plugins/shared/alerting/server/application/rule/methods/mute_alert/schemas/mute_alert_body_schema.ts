/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_SNOOZED_INSTANCE_CONDITIONS } from '../../../../../../common/max_alert_limit';
import { isoDateSchema } from '../../../schemas/date_schema';
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
    expiresAt: schema.maybe(isoDateSchema),
    conditions: schema.maybe(
      schema.arrayOf(snoozedInstanceConditionSchema, { maxSize: MAX_SNOOZED_INSTANCE_CONDITIONS })
    ),
    conditionOperator: schema.maybe(schema.oneOf([schema.literal('any'), schema.literal('all')])),
  },
  {
    validate: validateMuteAlertBody,
  }
);
