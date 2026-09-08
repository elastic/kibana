/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButtonWithTooltip } from '../../../../../components';

export enum AddIntegrationButtonDisabledReason {
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  OUTDATED_VERSION = 'OUTDATED_VERSION',
  MISSING_SECURITY = 'MISSING_SECURITY',
  MISSING_PRIVILEGES = 'MISSING_PRIVILEGES',
}

const TOOLTIP_MESSAGES: Record<AddIntegrationButtonDisabledReason, React.ReactNode> = {
  [AddIntegrationButtonDisabledReason.VERSION_MISMATCH]: (
    <FormattedMessage
      id="xpack.fleet.epm.addPackagePolicyButtonDifferentVersionTooltip"
      defaultMessage="This is not the installed version. Visit the Settings tab to navigate to the installed version."
    />
  ),
  [AddIntegrationButtonDisabledReason.OUTDATED_VERSION]: (
    <FormattedMessage
      id="xpack.fleet.epm.addPackagePolicyButtonOlderVersionTooltip"
      defaultMessage="This version is outdated. Visit the Settings tab to find the latest version."
    />
  ),
  [AddIntegrationButtonDisabledReason.MISSING_SECURITY]: (
    <FormattedMessage
      id="xpack.fleet.epm.addPackagePolicyButtonSecurityRequiredTooltip"
      defaultMessage="To add Elastic Agent Integrations, you must have security enabled and have the All privilege for Fleet. Contact your administrator."
    />
  ),
  [AddIntegrationButtonDisabledReason.MISSING_PRIVILEGES]: (
    <FormattedMessage
      id="xpack.fleet.epm.addPackagePolicyButtonPrivilegesRequiredTooltip"
      defaultMessage="Elastic Agent Integrations require the All privilege for Agent policies and All privilege for Integrations. Contact your administrator."
    />
  ),
};

interface AddIntegrationButtonProps {
  disabledReason?: AddIntegrationButtonDisabledReason;
  packageName: string;
  href: string;
  onClick: Function;
}

export function AddIntegrationButton(props: AddIntegrationButtonProps) {
  const { disabledReason, packageName, href, onClick } = props;

  const tooltip = disabledReason ? { content: TOOLTIP_MESSAGES[disabledReason] } : undefined;

  return (
    <EuiButtonWithTooltip
      fill
      isDisabled={!!disabledReason}
      iconType="plusCircle"
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
