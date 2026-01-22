/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf as ZodTypeOf } from '@kbn/zod';
import type { createRuleDataSchema } from './schemas/create_rule_data_schema';

export type CreateRuleData = ZodTypeOf<typeof createRuleDataSchema>;
