/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IacProviderRenderFlow } from '../../telemetry/iac_provider_events';

export interface RenderIacTemplateIntegration {
  /** EPR package name. */
  name: string;
  /**
   * Policy template names whose inputs should be included in the rendered
   * template. Multiple values are used when the same package appears in more
   * than one entry of a policy group (e.g. `guardduty` + `s3` in the AWS
   * global connector group both live in the `aws` package).
   */
  policyTemplates: string[];
}

export interface RenderIacTemplateRequest {
  provider: 'aws';
  /** The Kibana flow requesting the render; reported in telemetry. */
  flow: IacProviderRenderFlow;
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
