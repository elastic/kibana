/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IacProvisionerRenderFlow } from '../../telemetry/iac_provisioner_events';
import type { AWS_CLOUD_PROVIDER } from '../models/cloud_connector';

export interface RenderIacTemplateIntegration {
  /** EPR package name. */
  name: string;
  /**
   * Policy template names whose inputs should be included in the rendered
   * template — the templates the user actually enabled. A package exposing
   * several policy templates (e.g. `guardduty` and `s3` in the `aws` package)
   * sends one entry listing every enabled template.
   */
  policyTemplates: string[];
}

export interface RenderIacTemplateRequest {
  provider: typeof AWS_CLOUD_PROVIDER;
  /** The Kibana flow requesting the render; reported in telemetry. */
  flow: IacProvisionerRenderFlow;
  integrations: RenderIacTemplateIntegration[];
}

export interface RenderIacTemplateResponse {
  /**
   * Pre-signed URL of the rendered template. Embeds signing credentials —
   * never log or cache; fetch just-in-time.
   */
  artifactUrl: string;
  /** ISO 8601 UTC timestamp when the pre-signed URL expires. */
  expiresAt: string;
}
