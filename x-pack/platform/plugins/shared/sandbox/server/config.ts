/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const sslConfigSchema = schema.object(
  {
    certificate_authorities: schema.maybe(schema.string()),
    certificate: schema.maybe(schema.string()),
    key: schema.maybe(schema.string()),
  },
  {
    validate: ({ certificate, key }) => {
      if (certificate && !key) {
        return 'must specify [xpack.sandbox.ssl.key] when [xpack.sandbox.ssl.certificate] is specified';
      }
      if (key && !certificate) {
        return 'must specify [xpack.sandbox.ssl.certificate] when [xpack.sandbox.ssl.key] is specified';
      }
    },
  }
);

const configSchema = schema.object({
  // Core skips loading this plugin entirely when false.
  enabled: schema.boolean({ defaultValue: false }),
  // sandbox-api address — gRPC proxy that allocates sandboxes and proxies RPCs.
  host: schema.string({ defaultValue: 'localhost' }),
  port: schema.number({ defaultValue: 9090 }),
  // API key required by sandbox-api (ApiKey scheme). Required when enabled.
  api_key: schema.maybe(schema.string()),
  // mTLS PEM file paths. Without certificate/key, no client certificate is sent (API key only).
  ssl: sslConfigSchema,
});

export type SandboxPluginConfig = TypeOf<typeof configSchema>;
export type SandboxSslConfig = TypeOf<typeof sslConfigSchema>;

export const config: PluginConfigDescriptor<SandboxPluginConfig> = {
  schema: configSchema,
};
