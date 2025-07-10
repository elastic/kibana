/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

const pluginConfigSchema = schema.object({
  cdn: schema.maybe(
    schema.object({
      url: schema.maybe(schema.string()),
      publicKey: schema.maybe(schema.string()),
      requestTimeout: schema.maybe(schema.number()),
    })
  ),
});

export type PluginConfig = TypeOf<typeof pluginConfigSchema>;

export const config: PluginConfigDescriptor<PluginConfig> = {
  schema: pluginConfigSchema,
  dynamicConfig: {
    cdn: true,
  },
};
