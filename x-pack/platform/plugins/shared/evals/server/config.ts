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
  /**
   * `runtime` loads only what other plugins need to run evaluators in-process. `full` adds the
   * evals product: HTTP routes, the `evals` feature and privileges, data streams, the app,
   * the management section and the `ai.evals.*` workflow steps.
   *
   * Defaults to `full` until deployments that need the evals product (the golden cluster) set it
   * explicitly; the default then moves to `runtime`.
   */
  mode: schema.oneOf([schema.literal('runtime'), schema.literal('full')], {
    defaultValue: 'full',
  }),
});

export type EvalsConfig = TypeOf<typeof configSchema>;
export type EvalsMode = EvalsConfig['mode'];

export const config: PluginConfigDescriptor<EvalsConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    enabled: true,
    mode: true,
  },
};
