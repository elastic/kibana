/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const sandboxConfigSchema = schema.object({
  // sandbox-api address — gRPC proxy that allocates sandboxes and proxies RPCs.
  sandbox_api_host: schema.string({ defaultValue: 'localhost' }),
  sandbox_api_port: schema.number({ defaultValue: 9090 }),
  // API key required by sandbox-api for authentication (ApiKey scheme).
  sandbox_api_key: schema.string(),
  // mTLS PEM strings — all required.
  sandbox_api_tls_ca: schema.string(),
  sandbox_api_tls_cert: schema.string(),
  sandbox_api_tls_key: schema.string(),
});

const configSchema = schema.object({
  // Reserved: Core skips loading this plugin entirely when false.
  enabled: schema.boolean({ defaultValue: false }),
  sandbox: schema.maybe(sandboxConfigSchema),
});

export type NightshiftInvestigationsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<NightshiftInvestigationsConfig> = {
  schema: configSchema,
};
