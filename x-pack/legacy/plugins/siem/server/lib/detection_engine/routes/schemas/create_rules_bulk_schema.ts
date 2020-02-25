/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

import { createRulesSchema } from './create_rules_schema';

export const createRulesBulkSchema = Joi.array().items(createRulesSchema);
