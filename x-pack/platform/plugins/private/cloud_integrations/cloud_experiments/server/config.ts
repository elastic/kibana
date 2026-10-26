/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const launchDarklySchema = schema.object({
  sdk_key: schema.string({ minLength: 1 }),
  client_id: schema.string({ minLength: 1 }),
  client_log_level: schema.oneOf(
    [
      schema.literal('none'),
      schema.literal('error'),
      schema.literal('warn'),
      schema.literal('info'),
      schema.literal('debug'),
    ],
    { defaultValue: 'none' }
  ),
});

/**
 * Points Kibana's OpenFeature client at an OFREP server instead of LaunchDarkly.
 * `sdk_key` stays on the server. `client_id` is public and is exposed to the browser.
 */
const ofrepSchema = schema.object({
  base_url: schema.uri({ scheme: ['http', 'https'] }),
  sdk_key: schema.string({ minLength: 1 }),
  client_id: schema.string({ minLength: 1 }),
  poll_interval: schema.duration({ defaultValue: '30s' }),
});

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  // Optional in every mode. Production still requires this or `ofrep`; the plugin constructor enforces it,
  // because dev mode may rely on `flag_overrides` with neither provider.
  launch_darkly: schema.maybe(launchDarklySchema),
  ofrep: schema.maybe(ofrepSchema),
  metadata_refresh_interval: schema.duration({ defaultValue: '1h' }),
});

export type CloudExperimentsConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudExperimentsConfigType> = {
  exposeToBrowser: {
    launch_darkly: {
      client_id: true,
      client_log_level: true,
    },
    ofrep: {
      base_url: true,
      client_id: true,
      poll_interval: true,
    },
    metadata_refresh_interval: true,
  },
  schema: configSchema,
};
