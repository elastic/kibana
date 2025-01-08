/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiStepProps } from '@elastic/eui';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PLATFORM_TYPE } from '../../../hooks';
import { useFleetServerHostsForPolicy } from '../../../hooks';
import { useStartServices, useKibanaVersion } from '../../../hooks';

import { PlatformSelector } from '../..';

import { getInstallCommandForPlatform } from '../utils';

import type { DeploymentMode } from './set_deployment_mode';

export function getInstallFleetServerStep({
  isFleetServerReady,
  disabled,
  serviceToken,
  fleetServerHost,
  fleetServerPolicyId,
  deploymentMode,
}: {
  isFleetServerReady: boolean;
  disabled: boolean;
  serviceToken?: string;
  fleetServerHost?: string;
  fleetServerPolicyId?: string;
  deploymentMode: DeploymentMode;
}): EuiStepProps {
  return {
    title: i18n.translate('xpack.fleet.fleetServerFlyout.installFleetServerTitle', {
      defaultMessage: 'Install Fleet Server to a centralized host',
    }),
    status: disabled ? 'disabled' : isFleetServerReady ? 'complete' : 'incomplete',
    children: !disabled && (
      <InstallFleetServerStepContent
        serviceToken={serviceToken}
        fleetServerHost={fleetServerHost}
        fleetServerPolicyId={fleetServerPolicyId}
        deploymentMode={deploymentMode}
      />
    ),
  };
}

const InstallFleetServerStepContent: React.FunctionComponent<{
  serviceToken?: string;
  fleetServerHost?: string;
  fleetServerPolicyId?: string;
  deploymentMode: DeploymentMode;
}> = ({ serviceToken, fleetServerHost, fleetServerPolicyId, deploymentMode }) => {
  const { docLinks } = useStartServices();
  const kibanaVersion = useKibanaVersion();

  const { esOutput, esOutputProxy, downloadSource, downloadSourceProxy } =
    useFleetServerHostsForPolicy(
      fleetServerPolicyId
        ? {
            id: fleetServerPolicyId,
          }
        : null
    );

  const installCommands = (['linux', 'mac', 'windows', 'deb', 'rpm'] as PLATFORM_TYPE[]).reduce(
    (acc, platform) => {
      acc[platform] = getInstallCommandForPlatform({
        platform,
        esOutputHost: esOutput?.hosts?.[0] ?? '<ELASTICSEARCH_HOST>',
        esOutputProxy,
        serviceToken: serviceToken ?? '',
        policyId: fleetServerPolicyId,
        fleetServerHost,
        isProductionDeployment: deploymentMode === 'production',
        sslCATrustedFingerprint: esOutput?.ca_trusted_fingerprint ?? undefined,
        kibanaVersion,
        downloadSource,
        downloadSourceProxy,
      });

      return acc;
    },
    {} as Record<PLATFORM_TYPE, string>
  );

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerFlyout.installFleetServerInstructions"
          defaultMessage="Install Fleet Server agent on a centralized host so that other hosts you wish to monitor can connect to it. In production, we recommend using one or more dedicated hosts. For additional guidance, see our {installationLink}."
          values={{
            installationLink: (
              <EuiLink target="_blank" external href={docLinks.links.fleet.installElasticAgent}>
                <FormattedMessage
                  id="xpack.fleet.enrollmentInstructions.installationMessage.link"
                  defaultMessage="installation docs"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>

      <EuiSpacer size="l" />

      <PlatformSelector
        linuxCommand={installCommands.linux}
        macCommand={installCommands.mac}
        windowsCommand={installCommands.windows}
        linuxDebCommand={installCommands.deb}
        linuxRpmCommand={installCommands.rpm}
        k8sCommand={installCommands.kubernetes}
        hasK8sIntegration={false}
        hasK8sIntegrationMultiPage={false}
        hasFleetServer={true}
      />
    </>
  );
};
