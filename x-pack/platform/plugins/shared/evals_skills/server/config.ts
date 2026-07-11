/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

/**
 * The skills registered by this plugin are additionally gated on `xpack.evals.enabled`
 * (see {@link EvalsSkillsPlugin.setup}). This flag only allows an operator to disable
 * the glue plugin independently while leaving the evals feature itself enabled.
 */
export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
});

export type EvalsSkillsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<EvalsSkillsConfig> = {
  schema: configSchema,
};
