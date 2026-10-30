/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  serviceUrl: schema.uri({ scheme: ['http', 'https'], defaultValue: 'http://localhost:8800' }),
  sharedSecret: schema.maybe(schema.string({ minLength: 1 })),
  projectId: schema.string({
    defaultValue: 'tenant-a',
    validate: (value) =>
      /^[a-z0-9][a-z0-9-]{0,62}$/.test(value) ? undefined : 'must match ^[a-z0-9][a-z0-9-]{0,62}$',
  }),
});

export type TaskRunnerPocConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<TaskRunnerPocConfig> = {
  schema: configSchema,
  exposeToBrowser: { projectId: true },
};
