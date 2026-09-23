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
  managementUi: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
});

export type EsqlViewsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<EsqlViewsConfig> = {
  exposeToBrowser: {
    managementUi: true,
  },
  schema: configSchema,
};
