/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

/**
 * `enabled` looks redundant but is load-bearing: `ConfigService.isEnabledAtPath`
 * throws when `kibana.yml` sets `enabled` for a namespace whose schema does not
 * declare it, so without this key `xpack.agenticInvestigations.enabled: false`
 * would be a startup failure rather than a way to disable the plugin. No
 * plugin-side gate is needed — when the flag is `false` core never adds the
 * plugin to the plugin system, so `setup` is never called.
 */
const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
});

export type AgenticInvestigationsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AgenticInvestigationsConfig> = {
  schema: configSchema,
};
