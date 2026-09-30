/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendRenderIacTemplate } from '../../../hooks/use_request/iac_provisioner';
import { CLOUD_CONNECTOR_RENDER_FLOW } from '../../../../common/telemetry/iac_provisioner_events';
import { IAC_FEDERATED_IDENTITY_WORKFLOW } from '../../../../common/types/rest_spec/iac_provisioner';
import type {
  IacPolicyTemplateSelection,
  RenderedIacBlueprint,
  RenderIacTemplateIntegration,
  RenderIacTemplateRequest,
} from '../../../../common/types/rest_spec/iac_provisioner';
import { getArtifactLaunchUrl } from '../utils';

export interface GetRenderIntegrationsParams {
  /** Full integration set to render (union). When set, overrides packageName + policyTemplates. */
  integrations?: RenderIacTemplateIntegration[];
  packageName?: string;
  policyTemplates?: IacPolicyTemplateSelection[];
}

/**
 * Integrations to send to IaCP. A package with no enabled policy template is left out; an empty
 * result means there is nothing to render.
 */
export const getRenderIntegrations = ({
  integrations,
  packageName,
  policyTemplates,
}: GetRenderIntegrationsParams): RenderIacTemplateIntegration[] => {
  // A package with no policy templates cannot contribute to the template, so it is
  // dropped from a multi-package payload rather than sent to the provisioner.
  if (integrations) {
    return integrations.filter((integration) => integration.policyTemplates.length > 0);
  }
  return packageName && policyTemplates?.length ? [{ name: packageName, policyTemplates }] : [];
};

export interface RenderArtifactTemplateParams {
  provider: RenderIacTemplateRequest['provider'];
  integrations: RenderIacTemplateIntegration[];
  /** Stored template digest; IaCP answers `render: false` when the stack still matches it. */
  templateSha?: string;
  /**
   * Provider deployment identity of an existing stack (AWS: CloudFormation stack ARN); makes the
   * launch URL a stack-update deep link.
   */
  deploymentId?: string;
  stackParams?: Readonly<Record<string, string>>;
  /** Package's static quick-create URL; the launch URL keeps its console host and query params. */
  staticUrl?: string;
}

export type ArtifactRenderResult =
  | {
      status: 'rendered';
      /** Embeds the pre-signed artifact URL — never cache or persist it. */
      launchUrl: string;
      templateSha: string;
      blueprint: RenderedIacBlueprint;
    }
  /** The deployed stack already matches what IaCP would render. */
  | { status: 'current' }
  /** IaCP could not render a template; the caller may fall back to the static one. */
  | { status: 'failed' }
  /** A template was rendered, but the deployment id is not a stack the console can update. */
  | { status: 'no_launch_url' };

/** Renders the template with IaCP and resolves the console URL that launches it. */
export const renderArtifactTemplate = async ({
  provider,
  integrations,
  templateSha,
  deploymentId,
  stackParams,
  staticUrl,
}: RenderArtifactTemplateParams): Promise<ArtifactRenderResult> => {
  const { data, error } = await sendRenderIacTemplate({
    provider,
    workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
    flow: CLOUD_CONNECTOR_RENDER_FLOW,
    integrations,
    ...(templateSha ? { templateSha } : {}),
  });

  if (error || !data) {
    return { status: 'failed' };
  }
  // Only reachable when a stored templateSha was sent.
  if (data.render === false) {
    return { status: 'current' };
  }
  if (data.render !== true || !data.artifactUrl) {
    return { status: 'failed' };
  }

  const launchUrl = getArtifactLaunchUrl({
    provider,
    artifactUrl: data.artifactUrl,
    deploymentId,
    stackParams,
    staticUrl,
  });
  return launchUrl
    ? { status: 'rendered', launchUrl, templateSha: data.templateSha, blueprint: data.blueprint }
    : { status: 'no_launch_url' };
};
