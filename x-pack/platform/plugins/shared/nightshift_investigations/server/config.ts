/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const sandboxSslConfigSchema = schema.object({
  certificate_authorities: schema.maybe(schema.string()),
  certificate: schema.string(),
  key: schema.string(),
});

const sandboxConfigSchema = schema.object({
  // sandbox-api address — gRPC proxy that allocates sandboxes and proxies RPCs.
  host: schema.string({ defaultValue: 'localhost' }),
  port: schema.number({ defaultValue: 9090 }),
  // API key required by sandbox-api for authentication (ApiKey scheme).
  api_key: schema.string(),
  // mTLS inline PEM strings — required when sandbox is configured.
  ssl: sandboxSslConfigSchema,
  // Id of the preconfigured connector holding the Elasticsearch URL and API key the
  // sandbox queries telemetry with. It is added to the investigator's connector
  // allow-list; credentials are injected per command, only when the agent asks for it.
  telemetry_connector_id: schema.maybe(schema.string()),
});

const cortexConfigSchema = schema.object({
  // Governs Cortex end to end: the hydrate/optimize hooks on the deductive agent, the
  // Cortex HTTP routes, and the Cortex tab in the significant events app, which reads
  // this flag through the routes below.
  enabled: schema.boolean({ defaultValue: false }),
});

const decisionTreesConfigSchema = schema.object({
  // Governs the decision-tree reinforcement agent end to end: the post-execution hook on the
  // deductive agent, the hydrate step that materializes trees into the sandbox, the agent's own
  // tools, the decision-tree AI index, and the Decision Trees tab in the significant events app.
  // Trees are edited in the sandbox and read the Cortex investigator context, so this depends on
  // cortex.enabled (and sandbox) as well.
  enabled: schema.boolean({ defaultValue: false }),
});

const configSchema = schema.object({
  // Reserved: Core skips loading this plugin entirely when false.
  enabled: schema.boolean({ defaultValue: false }),
  sandbox: schema.maybe(sandboxConfigSchema),
  cortex: cortexConfigSchema,
  decision_trees: decisionTreesConfigSchema,
});

export type NightshiftInvestigationsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<NightshiftInvestigationsConfig> = {
  schema: configSchema,
};
