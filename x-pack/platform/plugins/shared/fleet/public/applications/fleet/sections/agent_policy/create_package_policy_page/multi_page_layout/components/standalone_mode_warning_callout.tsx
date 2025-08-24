/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiCallOut, EuiLink, EuiButton, EuiSpacer } from '@elastic/eui';

import type { MultiPageStepLayoutProps } from '../types';
import type { PackageInfo } from '../../../../types';
import { 
  FLEET_CLOUD_SECURITY_POSTURE_PACKAGE,
  FLEET_CLOUD_BEAT_PACKAGE 
} from '../../../../../../../../../../common/constants/epm';

export const StandaloneModeWarningCallout: React.FC<{
  setIsManaged: MultiPageStepLayoutProps['setIsManaged'];
  packageInfo?: PackageInfo;
}> = ({ setIsManaged, packageInfo }) => {
  const isCloudSecurityPackage = 
    packageInfo?.name === FLEET_CLOUD_SECURITY_POSTURE_PACKAGE ||
    packageInfo?.name === FLEET_CLOUD_BEAT_PACKAGE;

  return (
    <EuiCallOut
      title="Setting up to run Elastic Agent in standalone mode"
      color="primary"
      iconType="info"
    >
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.addIntegration.standaloneWarning"
          defaultMessage="Setting up integrations by running Elastic Agent in standalone mode is advanced. When possible, we recommend using {link} instead. "
          values={{ link: <EuiLink href="#">Fleet-managed agents</EuiLink> }}
        />
      </EuiText>
      {isCloudSecurityPackage && (
        <>
          <EuiSpacer size="m" />
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.addIntegration.cloudSecurityStandaloneWarning"
              defaultMessage="Important: This Cloud Security integration (Cloudbeat) only supports Linux and Kubernetes platforms. The macOS, Windows, RPM, and DEB deployment options shown below will not function correctly with this integration."
            />
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />
      <EuiButton onClick={() => setIsManaged(true)} color="primary">
        <FormattedMessage
          id="xpack.fleet.addIntegration.switchToManagedButton"
          defaultMessage="Enroll in Fleet instead (recommended)"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
