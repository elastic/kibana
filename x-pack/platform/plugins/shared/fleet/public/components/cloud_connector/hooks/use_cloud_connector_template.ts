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
import { AWS_CLOUD_PROVIDER } from '../../../../common/types/models/cloud_connector';
import type { AccountType } from '../../../types';
import type { CloudSetupForCloudConnector } from '../types';
import { getCloudConnectorRemoteRoleTemplate } from '../utils';

const TEMPLATE_URL_PARAM_REGEX = /templateURL=[^&]+/;

export interface UseCloudConnectorTemplateParams {
  cloud?: CloudSetupForCloudConnector;
  accountType: AccountType;
  iacTemplateUrl?: string;
  packageName?: string;
  /**
   * Policy templates the user has enabled in the policy being configured.
   * The rendered template grants permissions for exactly these — no more.
   */
  policyTemplates?: string[];
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
}

export const useCloudConnectorTemplate = ({
  cloud,
  accountType,
  iacTemplateUrl,
  packageName,
  policyTemplates,
}: UseCloudConnectorTemplateParams): UseCloudConnectorTemplateResult => {
  const { isIacProvisionerEnabled } = useIacProvisioner();
  const { analytics } = useStartServices();
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [templateGenerationError, setTemplateGenerationError] = useState<string | undefined>(
    undefined
  );

  // The static URL doubles as the quick-create scaffold for the rendered
  // artifact (console host + param_ElasticResourceId), so it is always built.
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

    // All render preconditions are checked synchronously, while the click's
    // user activation is still live and window.open is allowed. The static
    // URL must contain a templateURL param: it is the quick-create scaffold
    // the rendered artifact gets swapped into, and String.replace on a
    // non-matching URL would silently discard the render.
    if (
      !packageName ||
      !policyTemplates?.length ||
      !staticTemplateUrl ||
      !TEMPLATE_URL_PARAM_REGEX.test(staticTemplateUrl)
    ) {
      if (staticTemplateUrl) {
        reportFallback(IAC_PROVISIONER_FALLBACK_REASON_MISSING_CONTEXT);
        window.open(staticTemplateUrl, '_blank');
      } else {
        setTemplateGenerationError(
          i18n.translate('xpack.fleet.cloudConnector.iacProvisioner.missingContextError', {
            defaultMessage: 'CloudFormation template is not available for this integration.',
          })
        );
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
        provider: AWS_CLOUD_PROVIDER,
        flow: CLOUD_CONNECTOR_RENDER_FLOW,
        integrations: [{ name: packageName, policyTemplates }],
      });

      if (error || !data) {
        reportFallback(IAC_PROVISIONER_FALLBACK_REASON_RENDER_FAILED);
        navigateTo(staticTemplateUrl);
        return;
      }

      // Only the template source changes: swap the templateURL query param on
      // the existing quick-create URL. artifactUrl embeds signing credentials
      // — never cache it and never write it anywhere other than the URL.
      navigateTo(
        staticTemplateUrl.replace(
          TEMPLATE_URL_PARAM_REGEX,
          `templateURL=${encodeURIComponent(data.artifactUrl)}`
        )
      );
    } catch (e) {
      cloudFormationTab?.close();
      setTemplateGenerationError(
        i18n.translate('xpack.fleet.cloudConnector.iacProvisioner.templateGenerationError', {
          defaultMessage:
            'Failed to generate the CloudFormation template. Try again, or contact your administrator if the problem persists.',
        })
      );
    } finally {
      setIsGeneratingTemplate(false);
    }
  }, [analytics, packageName, policyTemplates, staticTemplateUrl]);

  if (!isIacProvisionerEnabled) {
    return {
      launchButtonProps: { href: staticTemplateUrl, target: '_blank' },
      isDisabled: !staticTemplateUrl,
      isGeneratingTemplate: false,
    };
  }

  return {
    launchButtonProps: { onClick: launchTemplate },
    isDisabled: false,
    isGeneratingTemplate,
    templateGenerationError,
  };
};
