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
  enabled: schema.boolean({ defaultValue: false }),

  /** Base URL of the page-render-service. */
  url: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),

  /**
   * Origin the render service uses to load Kibana pages. Replaces the origin of Reporting's capture
   * URLs, which point at the local server and are unreachable from a remote service. Falls back to
   * `server.publicBaseUrl`.
   */
  kibanaBaseUrl: schema.maybe(schema.uri({ scheme: ['https'] })),

  /** Client certificate presented to the render service. Must match `xpack.security.uiam.ssl`. */
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
  // Differs per serverless project, so it is set at runtime rather than in static config.
  dynamicConfig: {
    kibanaBaseUrl: true,
  },
};
