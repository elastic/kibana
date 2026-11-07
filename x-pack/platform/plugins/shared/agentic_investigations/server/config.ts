/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { offeringBasedSchema, schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

/**
 * `enabled` looks redundant but is load-bearing: `ConfigService.isEnabledAtPath`
 * throws when `kibana.yml` sets `enabled` for a namespace whose schema does not
 * declare it, so without this key `xpack.agenticInvestigations.enabled: false`
 * would be a startup failure rather than a way to disable the plugin. No
 * plugin-side gate is needed — when the flag is `false` core never adds the
 * plugin to the plugin system, so `setup` is never called.
 *
 * On by default in traditional deployments so AlertZero is available on ECH without
 * `kibana.yml` changes; still off by default in serverless.
 */
const configSchema = schema.object({
  enabled: offeringBasedSchema({
    serverless: schema.boolean({ defaultValue: false }),
    traditional: schema.boolean({ defaultValue: true }),
  }),
  /**
   * Escalations are AlertZero-only for now. When `false` (Observability serverless) the plugin
   * registers no escalations sub-feature, routes, or template UI, and the privileges probe reports
   * no escalation privileges. A config flag rather than a feature override because
   * `xpack.features.overrides` fails at startup when it names a feature that is not registered.
   */
  escalations: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
  /**
   * Opening a case from an investigation (AlertZero's "Open a case"). When on, it replaces
   * escalations: the escalations sub-feature, routes, page, and template UI are not registered,
   * exactly as when \`escalations.enabled\` is false. Existing escalation conversations stay readable
   * in Agent Builder. Needs the Cases plugin.
   */
  cases: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
});

export type AgenticInvestigationsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AgenticInvestigationsConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    escalations: { enabled: true },
    cases: { enabled: true },
  },
};
