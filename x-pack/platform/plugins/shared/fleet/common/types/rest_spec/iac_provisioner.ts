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
 * True when a resolve blueprint id belongs to the given IaCP workflow.
 * Resolve rows identify a lineage (`federated-identity` or
 * `aws/federated-identity`); render takes the workflow name
 * (`federated_identity`).
 */
export const blueprintMatchesWorkflow = (blueprintId: string, workflow: string): boolean => {
  const leaf = (blueprintId.split('/').pop() ?? blueprintId).replace(/-/g, '_');
  return leaf === workflow;
};

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
  workflow: string;
  /** The Kibana flow requesting the render; reported in telemetry. */
  flow: IacProvisionerRenderFlow;
  integrations: RenderIacTemplateIntegration[];
  /**
   * Stored template digest from this connector. Omit on first render and
   * after a static-template fallback. Send on dynamic reuse.
   */
  templateSha?: string;
  /** Optional user-supplied parameters forwarded to the template. */
  userParams?: Record<string, string>;
}

export interface RenderedIacBlueprint {
  id: string;
  version: string;
}

export interface RenderIacTemplateResponse {
  /**
   * Pre-signed URL of the rendered template. Embeds signing credentials —
   * never log or cache; fetch just-in-time.
   */
  artifactUrl: string;
  /** ISO 8601 UTC timestamp when the pre-signed URL expires. */
  expiresAt: string;
  /**
   * Digest of the canonical CloudFormation template. Persist on the
   * connector at confirmation, then send back as `templateSha` on the
   * next render.
   */
  templateSha: string;
  /**
   * True when the caller must send the user through CloudFormation
   * (first use, stored templateSha no longer matches, or leaving the
   * static template). False when the stored templateSha still matches.
   */
  render: boolean;
  /** Blueprint and version that was actually rendered. */
  blueprint: RenderedIacBlueprint;
}

export const IAC_NOT_COVERED_REASONS = [
  'unknown_package',
  'unknown_policy_template',
  'no_patch_for_input',
  'below_support_floor',
] as const;

export type IacNotCoveredReasonCode = (typeof IAC_NOT_COVERED_REASONS)[number];

export interface IacNotCoveredReason {
  /** EPR package name of the integration that is not covered. */
  integration: string;
  reason: IacNotCoveredReasonCode;
  policyTemplate?: string;
  input?: string;
  supportFloor?: string;
  installedVersion?: string;
}

export interface IacBlueprintCoverage {
  id: string;
  /** Blueprint version that satisfies the request, or null when not deployable. */
  resolvedVersion: string | null;
  deployable: boolean;
  notCovered: IacNotCoveredReason[];
}

export interface ResolveIacBlueprintsRequest {
  provider: typeof AWS_CLOUD_PROVIDER;
  /** The Kibana flow requesting resolve; reported in telemetry. */
  flow: IacProvisionerRenderFlow;
  integrations: RenderIacTemplateIntegration[];
}

export interface ResolveIacBlueprintsResponse {
  blueprints: IacBlueprintCoverage[];
}
