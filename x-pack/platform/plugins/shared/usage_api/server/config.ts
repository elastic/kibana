/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const tlsConfig = schema.object({
  certificate: schema.string(),
  key: schema.string(),
  ca: schema.string(),
});

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  url: schema.maybe(schema.string()),
  tls: schema.maybe(tlsConfig),
});

export type UsageApiConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<UsageApiConfigType> = {
  schema: configSchema,
};
