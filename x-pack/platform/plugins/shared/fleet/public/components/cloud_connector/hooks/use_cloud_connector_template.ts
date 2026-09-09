/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { useIacProvisioner, useStartServices } from '../../../hooks';
import { sendRenderIacTemplate } from '../../../hooks/use_request/iac_provisioner';
import {
  CLOUD_CONNECTOR_RENDER_FLOW,
  IAC_PROVISIONER_FALLBACK_REASON_MISSING_CONTEXT,
  IAC_PROVISIONER_FALLBACK_REASON_RENDER_FAILED,
  IAC_PROVISIONER_RENDER_FALLBACK_EVENT,
} from '../../../../common/telemetry/iac_provisioner_events';
import type { AccountType } from '../../../types';
import type {
  RenderIacTemplateIntegration,
  RenderIacTemplateRequest,
} from '../../../../common/types/rest_spec/iac_provisioner';
import type { CloudSetupForCloudConnector } from '../types';
import {
  getCloudConnectorRemoteRoleTemplate,
  getIacLaunchUrl,
  hasTemplateUrlParam,
} from '../utils';

const MISSING_CONTEXT_ERROR = i18n.translate(
  'xpack.fleet.cloudConnector.iacProvisioner.missingContextError',
  { defaultMessage: 'CloudFormation template is not available for this integration.' }
);

const TEMPLATE_GENERATION_ERROR = i18n.translate(
  'xpack.fleet.cloudConnector.iacProvisioner.templateGenerationError',
  {
    defaultMessage:
      'Failed to generate the CloudFormation template. Try again, or contact your administrator if the problem persists.',
  }
);

export interface UseCloudConnectorTemplateParams {
  /**
   * Provider whose form is calling. Typed from the render request so it widens
   * automatically when the IaC Provisioner gains Azure/GCP blueprints.
   */
  provider: RenderIacTemplateRequest['provider'];
  cloud?: CloudSetupForCloudConnector;
  accountType: AccountType;
  iacTemplateUrl?: string;
  packageName?: string;
  /**
   * Policy templates the user has enabled in the policy being configured.
   * The rendered template grants permissions for exactly these — no more.
   */
  policyTemplates?: string[];
  /** Full integration set to render (union). When set, overrides packageName + policyTemplates. */
  integrations?: RenderIacTemplateIntegration[];
  /** Existing stack to update; makes the launch URL a stack-update deep link. */
  deploymentId?: string;
  /** Called after a successful render with the key IaCP returned (undefined until IaCP ships it). */
  onTemplateRendered?: (rendered: { key?: string }) => void;
}

export type CloudConnectorLaunchButtonProps =
  /**
   * IaC Provisioner flow: renders the template just-in-time on click and opens
   * the CloudFormation console.
   */
  | { onClick: () => Promise<void> }
  /**
   * Static flow — today's behavior: a plain link keeps native browser
   * semantics (cmd-click, copy link, no popup blocker involvement).
   */
  | { href: string | undefined; target: '_blank' };

export interface UseCloudConnectorTemplateResult {
  /** Ready to spread onto the Launch CloudFormation button. */
  launchButtonProps: CloudConnectorLaunchButtonProps;
  isDisabled: boolean;
  isGeneratingTemplate: boolean;
  templateGenerationError?: string;
  isIacProvisionerEnabled: boolean;
}

export const useCloudConnectorTemplate = ({
  provider,
  cloud,
  accountType,
  iacTemplateUrl,
  packageName,
  policyTemplates,
  integrations,
  deploymentId,
  onTemplateRendered,
}: UseCloudConnectorTemplateParams): UseCloudConnectorTemplateResult => {
  const { isIacProvisionerEnabled } = useIacProvisioner();
  const { analytics } = useStartServices();
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [templateGenerationError, setTemplateGenerationError] = useState<string | undefined>(
    undefined
  );

  // The static URL doubles as the quick-create scaffold for the rendered
  // artifact (console host plus any quick-create params the package's URL
  // carries), so it is always built.
  const staticTemplateUrl = cloud
    ? getCloudConnectorRemoteRoleTemplate({ cloud, accountType, iacTemplateUrl })
    : undefined;

  const launchTemplate = useCallback(async () => {
    setTemplateGenerationError(undefined);

    const reportFallback = (reason: string) => {
      analytics.reportEvent(IAC_PROVISIONER_RENDER_FALLBACK_EVENT.eventType, {
        flow: CLOUD_CONNECTOR_RENDER_FLOW,
        reason,
      });
    };

    const renderIntegrations =
      integrations ??
      (packageName && policyTemplates?.length ? [{ name: packageName, policyTemplates }] : []);
    // With a deployment id the update deep link needs no scaffold; otherwise the static URL
    // must carry templateURL= or String.replace would silently discard the render.
    const hasScaffold = Boolean(deploymentId) || hasTemplateUrlParam(staticTemplateUrl);
    if (renderIntegrations.length === 0 || !hasScaffold) {
      if (staticTemplateUrl) {
        reportFallback(IAC_PROVISIONER_FALLBACK_REASON_MISSING_CONTEXT);
        window.open(staticTemplateUrl, '_blank');
      } else {
        setTemplateGenerationError(MISSING_CONTEXT_ERROR);
      }
      return;
    }

    // The tab must open synchronously within the user gesture — popup
    // blockers (Safari always, Firefox by default) drop window.open calls
    // made after an await. The tab is opened blank now and navigated (or
    // closed) once the render settles.
    const cloudFormationTab = window.open('', '_blank');
    const navigateTo = (url: string) => {
      if (cloudFormationTab && !cloudFormationTab.closed) {
        cloudFormationTab.location.href = url;
      } else {
        // The blank tab was blocked or closed mid-render; a direct open is
        // the only remaining option, even if the blocker eats it too.
        window.open(url, '_blank');
      }
    };

    setIsGeneratingTemplate(true);
    try {
      const { data, error } = await sendRenderIacTemplate({
        provider,
        flow: CLOUD_CONNECTOR_RENDER_FLOW,
        integrations: renderIntegrations,
      });

      if (error || !data) {
        reportFallback(IAC_PROVISIONER_FALLBACK_REASON_RENDER_FAILED);
        if (staticTemplateUrl) {
          navigateTo(staticTemplateUrl);
        } else {
          cloudFormationTab?.close();
          setTemplateGenerationError(TEMPLATE_GENERATION_ERROR);
        }
        return;
      }

      // Compute the launch URL before calling onTemplateRendered so the
      // callback only fires for renders that actually open the console.
      const launchUrl = getIacLaunchUrl({
        provider,
        staticUrl: staticTemplateUrl,
        artifactUrl: data.artifactUrl,
        deploymentId,
      });
      if (!launchUrl) {
        cloudFormationTab?.close();
        setTemplateGenerationError(MISSING_CONTEXT_ERROR);
        return;
      }
      onTemplateRendered?.({ key: data.key });
      navigateTo(launchUrl);
    } catch (e) {
      cloudFormationTab?.close();
      setTemplateGenerationError(TEMPLATE_GENERATION_ERROR);
    } finally {
      setIsGeneratingTemplate(false);
    }
  }, [
    analytics,
    deploymentId,
    integrations,
    onTemplateRendered,
    packageName,
    policyTemplates,
    provider,
    staticTemplateUrl,
  ]);

  if (!isIacProvisionerEnabled) {
    return {
      launchButtonProps: { href: staticTemplateUrl, target: '_blank' },
      isDisabled: !staticTemplateUrl,
      isGeneratingTemplate: false,
      isIacProvisionerEnabled,
    };
  }

  return {
    launchButtonProps: { onClick: launchTemplate },
    isDisabled: false,
    isGeneratingTemplate,
    templateGenerationError,
    isIacProvisionerEnabled,
  };
};
