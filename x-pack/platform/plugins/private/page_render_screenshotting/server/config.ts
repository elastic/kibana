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
   * default so the plugin stays inert until an operator points it at a real service.
   */
  url: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),

  /**
   * Origin the render service should use to fetch this Kibana, substituted into capture URLs.
   * Falls back to `server.publicBaseUrl` when unset.
   *
   * In serverless this should be Kibana's *internal* URL —
   * `https://<project_id>.kb.<region>.<csp>.internal.<base-domain>` — which resolves to the
   * ingress proxy's private load balancer and therefore never leaves the VPC. The public
   * fallback works, but sends the page-load credential out to the internet and back.
   *
   * Kibana cannot derive this itself: it knows its project id (`xpack.cloud.serverless.project_id`)
   * and csp (`xpack.cloud.csp`), but not its region or the environment's base domain. The
   * orchestrator composes the value instead, the same way kibana-controller already composes
   * `https://workload-identity-issuer.<region>.<csp>.<base-domain>`.
   */
  kibanaBaseUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),

  /**
   * Must be the same certificate as `xpack.security.uiam.ssl`: the service forwards this
   * identity to UIAM, which only honours the token minted for it.
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
  // `kibanaBaseUrl` is per-project — it embeds the project id — so it cannot be set as a static
  // per-environment override; something has to render it per project. Until an orchestrator does
  // (see the setting's own comment), marking it dynamic lets it be set on a live project with
  // `PUT /internal/core/_settings`, which is how the internal-URL path gets exercised in QA.
  // Requires `coreApp.allowDynamicConfigOverrides: true` in the target environment.
  dynamicConfig: {
    kibanaBaseUrl: true,
  },
};
