/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButtonWithTooltip } from '../../../../../components';

interface AddIntegrationButtonProps {
  userCanInstallPackages?: boolean;
  missingSecurityConfiguration: boolean;
  packageName: string;
  href: string;
  onClick: Function;
}

export function AddIntegrationButton(props: AddIntegrationButtonProps) {
  const { userCanInstallPackages, missingSecurityConfiguration, packageName, href, onClick } =
    props;

  const tooltip = !userCanInstallPackages
    ? {
        content: missingSecurityConfiguration ? (
          <FormattedMessage
            id="xpack.fleet.epm.addPackagePolicyButtonSecurityRequiredTooltip"
            defaultMessage="To add Elastic Agent Integrations, you must have security enabled and have the All privilege for Fleet. Contact your administrator."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.epm.addPackagePolicyButtonPrivilegesRequiredTooltip"
            defaultMessage="Elastic Agent Integrations require the All privilege for Agent policies and All privilege for Integrations. Contact your administrator."
          />
        ),
      }
    : undefined;

  return (
    <EuiButtonWithTooltip
      fill
      isDisabled={!userCanInstallPackages}
      iconType="plusInCircle"
      href={href}
      onClick={(e) => onClick(e)}
      data-test-subj="addIntegrationPolicyButton"
      tooltip={tooltip}
    >
      <FormattedMessage
        id="xpack.fleet.epm.addPackagePolicyButtonText"
        defaultMessage="Add {packageName}"
        values={{
          packageName,
        }}
      />
    </EuiButtonWithTooltip>
  );
}
