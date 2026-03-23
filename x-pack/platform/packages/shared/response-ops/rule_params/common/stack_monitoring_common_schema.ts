/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const baseSchema = schema.object({
  threshold: schema.maybe(schema.number()),
  duration: schema.string(),
  filterQuery: schema.maybe(schema.string({})),
  filterQueryText: schema.maybe(schema.string({})),
});

export const stackMonitoringCommonSchema = baseSchema.extends({
  limit: schema.maybe(schema.string()),
});

export type StackMonitoringType = TypeOf<typeof stackMonitoringCommonSchema>;
