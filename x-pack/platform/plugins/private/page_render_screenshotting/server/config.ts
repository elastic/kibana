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
   * Client certificate presented to page-render-service, and the CAs used to trust it.
   *
   * This must be the same certificate configured under `xpack.security.uiam.ssl`: the
   * service reads the caller's identity off this certificate and forwards it to UIAM
   * alongside the token minted for it, and UIAM only honours the token together with
   * the identity it was minted for.
   */
  ssl: schema.object({
    verificationMode: schema.oneOf(
      [schema.literal('none'), schema.literal('certificate'), schema.literal('full')],
      { defaultValue: 'full' }
    ),
    certificate: schema.maybe(schema.string()),
    key: schema.maybe(schema.string()),
    certificateAuthorities: schema.maybe(
      schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { minSize: 1 })])
    ),
  }),
});

export type PluginConfig = TypeOf<typeof pluginConfigSchema>;

export const config: PluginConfigDescriptor<PluginConfig> = {
  schema: pluginConfigSchema,
};
