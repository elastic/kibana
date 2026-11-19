/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  parseRruleString,
  RRULE_STRING_DESCRIPTION,
  RRULE_STRING_MAX_LENGTH,
} from '@kbn/response-ops-scheduling-utils';

export const rruleStringSchema = schema.string({
  minLength: 1,
  maxLength: RRULE_STRING_MAX_LENGTH,
  validate: (value) => parseRruleString(value).error,
  meta: {
    description: RRULE_STRING_DESCRIPTION,
  },
});
