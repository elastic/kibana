/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, type EuiFormRowProps, EuiIcon, EuiIconTip } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { ACTION_SECRETS_MINIMUM_FLEET_SERVER_VERSION } from '../../../../../../../../common/constants/secrets';

export const SecretFormRow: React.FC<{
  children: EuiFormRowProps['children'];
  fullWidth: boolean;
  useSecretsStorage: boolean;
  secretLabelTitle: string;
  plainTextLabel: JSX.Element;
  additionalHelpText: string;
}> = ({
  children,
  fullWidth,
  useSecretsStorage,
  secretLabelTitle,
  plainTextLabel,
  additionalHelpText,
}) => {
  const secretLabel = (
    <>
      <EuiIcon type="lock" data-test-subj="lockIcon" />
      &nbsp;
      {secretLabelTitle}
      &nbsp;
      <EuiIconTip
        content={i18n.translate(
          'xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.secretFormRow.secretLabelTooltip',
          {
            defaultMessage: 'This value will be stored as a secret.',
          }
        )}
        type="question"
      />
    </>
  );

  const secretHelpText = (
    <FormattedMessage
      id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.secretFormRow.secretHelpText"
      defaultMessage="{description}{br}This field uses secret storage and requires Fleet Server v{minVersion} or higher."
      values={{
        description: additionalHelpText,
        br: <br />,
        minVersion: ACTION_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
      }}
    />
  );

  const plainHelpText = (
    <FormattedMessage
      id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.secretFormRow.plainHelpText"
      defaultMessage="{description}{br}Upgrade Fleet Server to v{minVersion} or higher to store this field as a secret."
      values={{
        description: additionalHelpText,
        br: <br />,
        minVersion: ACTION_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
      }}
    />
  );

  const label = useSecretsStorage ? secretLabel : plainTextLabel;
  const helpText = useSecretsStorage ? secretHelpText : plainHelpText;

  return (
    <EuiFormRow fullWidth={fullWidth} label={label} helpText={helpText}>
      {children}
    </EuiFormRow>
  );
};
