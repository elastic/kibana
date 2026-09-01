/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IacProvisionerRenderFlow } from '../../telemetry/iac_provisioner_events';
import type { AWS_CLOUD_PROVIDER } from '../models/cloud_connector';

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
   * Blueprint to render, taken from a deployable entry in the resolve
   * response. An unknown id is rejected by the provisioner.
   */
  blueprintId: string;
  /** The Kibana flow requesting the render; reported in telemetry. */
  flow: IacProvisionerRenderFlow;
  integrations: RenderIacTemplateIntegration[];
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
