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
import type { AccountType } from '../../../types';
import type { CloudSetupForCloudConnector } from '../types';
import { getCloudConnectorRemoteRoleTemplate } from '../utils';

const TEMPLATE_URL_PARAM_REGEX = /templateURL=[^&]+/;

export interface UseCloudConnectorTemplateParams {
  cloud?: CloudSetupForCloudConnector;
  accountType: AccountType;
  iacTemplateUrl?: string;
  packageName?: string;
  policyTemplate?: string;
}

export interface UseCloudConnectorTemplateResult {
  /**
   * Static quick-create URL for a plain `href` — today's behavior. Undefined
   * when the IaC Provider flow is active (use `launchTemplate` instead).
   */
  templateUrl: string | undefined;
  /**
   * Renders the template just-in-time via the IaC Provider and opens the
   * CloudFormation console. Only set when the IaC Provider flow is active.
   */
  launchTemplate?: () => Promise<void>;
  isRendering: boolean;
  renderError?: string;
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
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | undefined>(undefined);

  // The static URL doubles as the quick-create scaffold for the rendered
  // artifact (console host + param_ElasticResourceId), so it is always built.
  const staticTemplateUrl = cloud
    ? getCloudConnectorRemoteRoleTemplate({ cloud, accountType, iacTemplateUrl })
    : undefined;

  const launchTemplate = useCallback(async () => {
    setRenderError(undefined);

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
        setRenderError(
          i18n.translate('xpack.fleet.cloudConnector.iacProvider.missingContextError', {
            defaultMessage: 'CloudFormation template is not available for this integration.',
          })
        );
      }
      return;
    }

    setIsRendering(true);
    try {
      const { data, error } = await sendRenderIacTemplate({
        provider: 'aws',
        packageName,
        policyTemplate,
      });

      if (error || !data) {
        if (!openFallback('render_failed')) {
          setRenderError(
            i18n.translate('xpack.fleet.cloudConnector.iacProvider.renderError', {
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
      setIsRendering(false);
    }
  }, [analytics, packageName, policyTemplate, staticTemplateUrl]);

  if (!isIacProviderEnabled) {
    return { templateUrl: staticTemplateUrl, isRendering: false };
  }

  return { templateUrl: undefined, launchTemplate, isRendering, renderError };
};
