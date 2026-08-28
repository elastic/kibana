/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const pluginConfigSchema = schema.object({
  /**
   * Off by default. When enabled, this plugin's `getScreenshots` is preferred over the real
   * `screenshotting` plugin's by the reporting plugin (see reporting's `server/plugin.ts`).
   */
  enabled: schema.boolean({ defaultValue: false }),

  /**
   * Base URL of the page-render-service instance to POST render requests to, e.g.
   * `http://localhost:3001`. Required for this plugin to do anything useful; left unset by
   * default since the POC render service doesn't have a stable dev-platform URL yet.
   */
  url: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),

  /**
   * Shared secret sent as `x-render-service-secret` on every request. Hardcoded POC default —
   * matches the value baked into page-render-service's local `.env.example` and its Helm chart
   * (`dev-poc-shared-secret`). Intentionally not a real secret; replace with a proper one before
   * this goes beyond a POC.
   */
  secret: schema.string({ defaultValue: 'dev-poc-shared-secret' }),
});

export type PluginConfig = TypeOf<typeof pluginConfigSchema>;

export const config: PluginConfigDescriptor<PluginConfig> = {
  schema: pluginConfigSchema,
};
