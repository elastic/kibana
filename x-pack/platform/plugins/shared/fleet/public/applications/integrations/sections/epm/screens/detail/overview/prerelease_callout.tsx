/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import type { PackageInfo } from '../../../../../types';

import { useLink, useStartServices } from '../../../../../hooks';
import { isPackagePrerelease } from '../../../../../../../../common/services';
import {
  OTEL_INPUTS_MINIMUM_VERSION,
  packageInfoHasOtelInputs,
} from '../../../../../../../../common/services/otelcol_helpers';
import { ExperimentalFeaturesService } from '../../../../../services';
import { wrapTitleWithDeprecated } from '../../../components/utils';

export const PrereleaseCallout: React.FC<{
  packageInfo: PackageInfo;
  latestGAVersion?: string;
}> = ({ packageInfo, latestGAVersion }) => {
  const { getHref } = useLink();
  const { enableOtelIntegrations } = ExperimentalFeaturesService.get();
  const { name, title } = packageInfo;
  const overviewPathLatestGA = getHref('integration_details_overview', {
    pkgkey: `${name}-${latestGAVersion}`,
  });
  const isPrerelease = isPackagePrerelease(packageInfo.version);
  if (!isPrerelease) return null;

  if (enableOtelIntegrations && packageInfoHasOtelInputs(packageInfo)) {
    return <OtelPackageCallout packageInfo={packageInfo} />;
  }
  return (
    <>
      <EuiCallOut
        announceOnMount
        data-test-subj="prereleaseCallout"
        title={i18n.translate('xpack.fleet.epm.prereleaseWarningCalloutTitle', {
          defaultMessage: 'This is a pre-release version of {packageTitle} integration.',
          values: {
            packageTitle: title,
          },
        })}
        iconType="info"
        color="warning"
      >
        {latestGAVersion && (
          <p>
            <EuiButton href={overviewPathLatestGA} color="warning" data-test-subj="switchToGABtn">
              <FormattedMessage
                id="xpack.fleet.epm.prereleaseWarningCalloutSwitchToGAButton"
                defaultMessage="Switch to latest GA version"
              />
            </EuiButton>
          </p>
        )}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

export const OtelPackageCallout: React.FC<{
  packageInfo: PackageInfo;
}> = ({ packageInfo }) => {
  const { docLinks } = useStartServices();
  const packageTitle = wrapTitleWithDeprecated({ packageInfo });

  return (
    <>
      <EuiCallOut
        announceOnMount
        data-test-subj="prereleaseCallout"
        title={i18n.translate('xpack.fleet.epm.otelPackageWarningTitle', {
          defaultMessage: 'This is a pre-release version of {packageTitle} integration.',
          values: {
            packageTitle,
          },
        })}
        iconType="warning"
        color="warning"
      >
        <p>
          <FormattedMessage
            id="xpack.fleet.epm.otelPackageWarningMessage"
            defaultMessage="The {packageTitle} integration collects {OTelExternalLink} data adhering to {semanticConventionsLink}, and is available in technical preview. To collect OTel data, Elastic Agents must be on version {minVersion} or later. For more information, refer to the {fleetUserGuide}."
            values={{
              packageTitle,
              OTelExternalLink: (
                <EuiLink href="https://opentelemetry.io/" target="_blank" external>
                  {i18n.translate('xpack.fleet.settings.otelPackageWarning.OtelLinkLabel', {
                    defaultMessage: 'OpenTelemetry',
                  })}
                </EuiLink>
              ),
              semanticConventionsLink: (
                <EuiLink
                  href="https://opentelemetry.io/docs/concepts/semantic-conventions/"
                  target="_blank"
                  external
                >
                  {i18n.translate(
                    'xpack.fleet.settings.otelPackageWarning.semanticConventionsLinkLabel',
                    {
                      defaultMessage: 'semantic conventions',
                    }
                  )}
                </EuiLink>
              ),
              fleetUserGuide: (
                <EuiLink href={docLinks.links.fleet.edotCollector} target="_blank">
                  {i18n.translate('xpack.fleet.epm.otelPackageWarningMessage.fleetUserGuideLabel', {
                    defaultMessage: 'user guide',
                  })}
                </EuiLink>
              ),
              minVersion: OTEL_INPUTS_MINIMUM_VERSION,
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
