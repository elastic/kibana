/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CommandsByPlatform } from '../../applications/fleet/components/fleet_server_instructions/utils';

import { InstallationMessage } from '../agent_enrollment_flyout/installation_message';

import type { K8sMode, CloudSecurityIntegration } from '../agent_enrollment_flyout/types';
import { PlatformSelector } from '../platform_selector';

import { RootPrivilegesCallout } from './root_privileges_callout';
import { UnprivilegedInfo } from './unprivileged_info';

interface Props {
  installCommand: CommandsByPlatform;
  isK8s: K8sMode | undefined;
  cloudSecurityIntegration: CloudSecurityIntegration | undefined;
  enrollToken?: string;
  fleetServerHost?: string;
  fullCopyButton?: boolean;
  isManaged?: boolean;
  onCopy?: () => void;
  rootIntegrations?: Array<{ name: string; title: string }>;
}

export const InstallSection: React.FunctionComponent<Props> = ({
  installCommand,
  isK8s,
  cloudSecurityIntegration,
  enrollToken,
  fleetServerHost,
  fullCopyButton = false,
  isManaged = true,
  onCopy,
  rootIntegrations,
}) => {
  return (
    <>
      <InstallationMessage isK8s={isK8s} isManaged={isManaged} />
      <RootPrivilegesCallout rootIntegrations={rootIntegrations} />
      <UnprivilegedInfo />
      <PlatformSelector
        fullCopyButton={fullCopyButton}
        onCopy={onCopy}
        installCommand={installCommand}
        hasK8sIntegration={isK8s === 'IS_KUBERNETES' || isK8s === 'IS_KUBERNETES_MULTIPAGE'}
        cloudSecurityIntegration={cloudSecurityIntegration}
        hasK8sIntegrationMultiPage={isK8s === 'IS_KUBERNETES_MULTIPAGE'}
        isManaged={isManaged}
        enrollToken={enrollToken}
        fleetServerHost={fleetServerHost}
      />
    </>
  );
};
