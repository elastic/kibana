/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
import { queryFilter, fields, per_page, page, sort_field, sort_order } from './schemas';
/* eslint-enable @typescript-eslint/camelcase */

export const findRulesSchema = Joi.object({
  fields,
  filter: queryFilter,
  per_page,
  page,
  sort_field: Joi.when(Joi.ref('sort_order'), {
    is: Joi.exist(),
    then: sort_field.required(),
    otherwise: sort_field.optional(),
  }),
  sort_order,
});
