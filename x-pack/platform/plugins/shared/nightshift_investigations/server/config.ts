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
  // ContainerManager address — allocates sandboxes and returns per-conversation certs.
  containermanager_host: schema.string({ defaultValue: 'localhost' }),
  containermanager_port: schema.number({ defaultValue: 50051 }),
  // PEM-encoded TLS server cert for the ContainerManager (for cert pinning).
  containermanager_server_cert: schema.maybe(schema.string()),
  // Data-plane port the sandbox listens on (same for all sandboxes).
  sandbox_port: schema.number({ defaultValue: 8080 }),
  // Stable client identity reused across all sandboxes.
  client_cert: schema.string(),
  client_key: schema.string(),
  // Optional org identifier forwarded to containermanager.
  organization_id: schema.string({ defaultValue: 'default' }),
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
