/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const dataAnalyticsJobConfigSchema = {
  description: schema.maybe(schema.string()),
  dest: schema.object({
    index: schema.string(),
    results_field: schema.maybe(schema.string()),
  }),
  source: schema.object({
    index: schema.string(),
  }),
  analysis: schema.any(),
  analyzed_fields: schema.any(),
  model_memory_limit: schema.string(),
};
