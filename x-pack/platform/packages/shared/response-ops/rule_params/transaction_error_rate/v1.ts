/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { searchConfigurationSchema } from '../common/search_configuration_schema';

export const transactionErrorRateParamsSchema = schema.object({
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  transactionType: schema.maybe(schema.string()),
  transactionName: schema.maybe(schema.string()),
  serviceName: schema.maybe(schema.string()),
  environment: schema.string(),
  groupBy: schema.maybe(schema.arrayOf(schema.string())),
  useKqlFilter: schema.maybe(schema.boolean()),
  searchConfiguration: schema.maybe(searchConfigurationSchema),
});

export type TransactionErrorRateRuleParams = TypeOf<typeof transactionErrorRateParamsSchema>;
