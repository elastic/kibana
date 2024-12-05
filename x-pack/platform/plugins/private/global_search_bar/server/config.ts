/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  input_max_limit: schema.number({
    defaultValue: 1000,
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
  exposeToBrowser: {
    input_max_limit: true,
  },
};
