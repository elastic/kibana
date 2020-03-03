/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
import { rule_id, id } from './schemas';
/* eslint-enable @typescript-eslint/camelcase */

export const queryRulesSchema = Joi.object({
  rule_id,
  id,
}).xor('id', 'rule_id');
