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
  /**
   * Off by default while secrets are in development. Features that use secrets, like
   * Workflows, turn their secrets support on when this plugin is enabled.
   */
  enabled: schema.boolean({ defaultValue: false }),
});

export type SecretsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<SecretsConfig> = {
  schema: configSchema,
};
