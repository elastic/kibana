/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IacProvisionerRenderFlow } from '../../telemetry/iac_provisioner_events';
import type { AWS_CLOUD_PROVIDER } from '../models/cloud_connector';

/** IaCP workflow name for the AWS federated-identity connector. */
export const IAC_FEDERATED_IDENTITY_WORKFLOW = 'federated_identity' as const;

/**
 * Upper bound on packages per render. Each entry costs a registry fetch, so the cap bounds abuse;
 * it sits well above the AWS onboarding's package count so a real selection never hits it. The
 * connector verify route shares the limit for the integrations it accepts AND the merged set it
 * returns, because the browser re-renders that set as-is: a connector attached to more packages
 * than this is reported with an empty set and left uncompared rather than offered an Update that
 * the render route would reject.
 */
export const MAX_IAC_RENDER_INTEGRATIONS = 25;

export interface IacPolicyTemplateSelection {
  /** Policy template name as declared in the integration's package manifest. */
  name: string;
  /** Input types the user enabled within this policy template. */
  enabledInputs: string[];
}

export interface RenderIacTemplateIntegration {
  /** EPR package name. */
  name: string;
  /**
   * Policy templates the user enabled, each with the inputs they actually
   * turned on. A package exposing several policy templates (e.g. `guardduty`
   * and `s3` in the `aws` package) sends one entry listing every enabled
   * template.
   */
  policyTemplates: IacPolicyTemplateSelection[];
}

export interface RenderIacTemplateRequest {
  provider: typeof AWS_CLOUD_PROVIDER;
  /**
   * Identity mechanism. Kibana's name for the connector type. IaCP looks
   * up the matching blueprint lineage and always renders the newest
   * supported version.
   */
  workflow: typeof IAC_FEDERATED_IDENTITY_WORKFLOW;
  /** The Kibana flow requesting the render; reported in telemetry. */
  flow: IacProvisionerRenderFlow;
  integrations: RenderIacTemplateIntegration[];
  /**
   * Stored template digest from this connector. Omit on first render and
   * after a static-template fallback. Send on dynamic reuse.
   */
  templateSha?: string;
}

export interface RenderedIacBlueprint {
  id: string;
  version: string;
}

export interface RenderIacTemplateResponse {
  /**
   * Pre-signed URL of the rendered template. Present only when `render` is
   * true. Embeds signing credentials — never log or cache.
   */
  artifactUrl?: string;
  /** ISO 8601 UTC timestamp when the pre-signed URL expires. Present with artifactUrl. */
  expiresAt?: string;
  /**
   * Digest of the canonical CloudFormation template. Persist on the
   * connector as `iac_key` at confirmation, then send back as `templateSha`
   * on the next render.
   */
  templateSha: string;
  /**
   * True when the caller must send the user through CloudFormation
   * (first use, stored templateSha no longer matches, or leaving the
   * static template). False when the stored templateSha still matches.
   */
  render: boolean;
  /** Blueprint and version that produced this artifact. */
  blueprint: RenderedIacBlueprint;
}
