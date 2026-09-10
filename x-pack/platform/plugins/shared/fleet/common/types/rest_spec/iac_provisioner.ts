/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CLOUD_CONNECTOR_RENDER_FLOW } from '../../telemetry/iac_provisioner_events';
import type { AWS_CLOUD_PROVIDER } from '../models/cloud_connector';

export interface RenderIacTemplatePolicyTemplate {
  /** Policy template name, as declared in the package manifest. */
  name: string;
  /**
   * The input types the user enabled within this policy template. IaCP patches its
   * blueprint from every input listed here, so a manifest input the user did not
   * enable must never appear — it would over-grant permissions.
   * See `api/v1-render-spec.yml` in elastic/cloud-iac-provisioner.
   */
  enabledInputs: string[];
}

export interface RenderIacTemplateIntegration {
  /** EPR package name. */
  name: string;
  /**
   * The policy templates the user actually enabled, each with its enabled input
   * types. A package exposing several policy templates (e.g. `guardduty` and `s3`
   * in the `aws` package) sends one entry listing every enabled template.
   */
  policyTemplates: RenderIacTemplatePolicyTemplate[];
}

export interface RenderIacTemplateRequest {
  provider: typeof AWS_CLOUD_PROVIDER;
  /**
   * The Kibana flow requesting the render; reported in telemetry. Only
   * browser-initiated renders use this route — the key comparison in
   * `compareIacKey` calls the provider directly.
   */
  flow: typeof CLOUD_CONNECTOR_RENDER_FLOW;
  integrations: RenderIacTemplateIntegration[];
}

/**
 * IaCP's render response, passed through unchanged.
 * `templateSha`, `render` and `blueprint` are required by the provider's spec but
 * optional here so a provider predating the contract fails open rather than
 * breaking the route. https://github.com/elastic/ingest-dev/issues/9415
 */
export interface RenderIacTemplateResponse {
  /**
   * Pre-signed URL of the rendered template. Embeds signing credentials —
   * never log or cache; fetch just-in-time.
   */
  artifactUrl: string;
  /** ISO 8601 UTC timestamp when the pre-signed URL expires. */
  expiresAt: string;
  /** Digest of the rendered template; stored on the cloud connector as `iac_key`. */
  templateSha?: string;
  /** True when the user must apply the rendered template; false when the stored digest still matches. */
  render?: boolean;
  /** The IaCP blueprint the template was rendered from. */
  blueprint?: { id: string; version: string };
}
