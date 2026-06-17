/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const searchConfigurationSchema = schema.object({
  query: schema.object({
    query: schema.oneOf([schema.string(), schema.recordOf(schema.string(), schema.any())]),
    language: schema.string(),
  }),
});

export type SearchConfigurationType = TypeOf<typeof searchConfigurationSchema>;
