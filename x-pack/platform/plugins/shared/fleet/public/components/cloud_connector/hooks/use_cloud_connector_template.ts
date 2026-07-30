/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { useIacProvider, useStartServices } from '../../../hooks';
import { sendRenderIacTemplate } from '../../../hooks/use_request/iac_provider';
import { IAC_PROVIDER_RENDER_FALLBACK_EVENT } from '../../../../common/telemetry/iac_provider_events';
import {
  CLOUD_CONNECTOR_PERMISSION_ALLOWLIST,
  getPolicyGroupForIntegration,
} from '../../../../common/constants/cloud_connector';
import type { RenderIacTemplateIntegration } from '../../../../common/types/rest_spec/iac_provider';
import type { AccountType } from '../../../types';
import type { CloudSetupForCloudConnector } from '../types';
import { getCloudConnectorRemoteRoleTemplate } from '../utils';

const TEMPLATE_URL_PARAM_REGEX = /templateURL=[^&]+/;

/**
 * Builds the `integrations` payload for the render request.
 *
 * A cloud connector is shared by every integration in its policy group, so
 * the rendered template must grant the whole group's permissions — not just
 * the integration currently being set up (Decision D1). An integration that
 * belongs to no group is rendered on its own.
 *
 * Group entries can live in the same EPR package (`guardduty` and `s3` are
 * both policy templates of the `aws` package); those are merged into a single
 * integration listing both policy templates, because the render request must
 * not repeat a package name.
 */
const getIntegrationsToRender = (
  packageName: string,
  policyTemplate: string
): RenderIacTemplateIntegration[] => {
  const policyGroup = getPolicyGroupForIntegration(packageName, policyTemplate);
  const groupEntries = policyGroup
    ? CLOUD_CONNECTOR_PERMISSION_ALLOWLIST[policyGroup].filter((e) => e.provider === 'aws')
    : [{ package: packageName, policyTemplate }];

  const templatesByPackage = new Map<string, string[]>();
  for (const entry of groupEntries) {
    templatesByPackage.set(entry.package, [
      ...(templatesByPackage.get(entry.package) ?? []),
      entry.policyTemplate,
    ]);
  }

  return Array.from(templatesByPackage, ([name, policyTemplates]) => ({ name, policyTemplates }));
};

export interface UseCloudConnectorTemplateParams {
  cloud?: CloudSetupForCloudConnector;
  accountType: AccountType;
  iacTemplateUrl?: string;
  packageName?: string;
  policyTemplate?: string;
}

export type CloudConnectorLaunchButtonProps =
  /**
   * IaC Provider flow: renders the template just-in-time on click and opens
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
  policyTemplate,
}: UseCloudConnectorTemplateParams): UseCloudConnectorTemplateResult => {
  const { isIacProviderEnabled } = useIacProvider();
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

    const openFallback = (reason: string) => {
      if (staticTemplateUrl) {
        analytics.reportEvent(IAC_PROVIDER_RENDER_FALLBACK_EVENT.eventType, {
          flow: 'cloud_connector',
          reason,
        });
        window.open(staticTemplateUrl, '_blank');
        return true;
      }
      return false;
    };

    if (!packageName || !policyTemplate || !staticTemplateUrl) {
      if (!openFallback('missing_render_context')) {
        setTemplateGenerationError(
          i18n.translate('xpack.fleet.cloudConnector.iacProvider.missingContextError', {
            defaultMessage: 'CloudFormation template is not available for this integration.',
          })
        );
      }
      return;
    }

    setIsGeneratingTemplate(true);
    try {
      const { data, error } = await sendRenderIacTemplate({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: getIntegrationsToRender(packageName, policyTemplate),
      });

      if (error || !data) {
        if (!openFallback('render_failed')) {
          setTemplateGenerationError(
            i18n.translate('xpack.fleet.cloudConnector.iacProvider.templateGenerationError', {
              defaultMessage:
                'Failed to generate the CloudFormation template. Try again, or contact your administrator if the problem persists.',
            })
          );
        }
        return;
      }

      // Only the template source changes: swap the templateURL query param on
      // the existing quick-create URL. artifactUrl embeds signing credentials
      // — never cache it and never write it anywhere other than the URL.
      window.open(
        staticTemplateUrl.replace(
          TEMPLATE_URL_PARAM_REGEX,
          `templateURL=${encodeURIComponent(data.artifactUrl)}`
        ),
        '_blank'
      );
    } finally {
      setIsGeneratingTemplate(false);
    }
  }, [analytics, packageName, policyTemplate, staticTemplateUrl]);

  if (!isIacProviderEnabled) {
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
