/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  aesop: schema.object({
    // TODO(AESOP-flag): default is `true` on this branch so the Technical Preview
    // can be demoed without flipping kibana.dev.yml. Flip to `false` before
    // splitting into PR A4 so AESOP ships opt-in to production.
    enabled: schema.boolean({ defaultValue: true }),
  }),
});

export type EvalsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<EvalsConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    aesop: true,
  },
};
