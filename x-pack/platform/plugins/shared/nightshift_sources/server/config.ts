/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const configSchema = schema.object({
  // Reserved: Core skips loading this plugin entirely when false. Serverless turns it off
  // for every project type except Observability Complete (see config/serverless*.yml).
  enabled: schema.boolean({ defaultValue: true }),
});

export const config: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
  schema: configSchema,
};
