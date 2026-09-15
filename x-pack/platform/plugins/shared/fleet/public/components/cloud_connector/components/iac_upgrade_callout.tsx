/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

import { CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';

export interface IacUpgradeCalloutProps {
  checkedAt?: string;
  hasKey: boolean;
  canUpdate: boolean;
  isUpdating: boolean;
  onUpdateStack: () => void;
  onVerify: () => void;
  isVerifying: boolean;
}

/** Upgrade callout shown in the connector flyout when iac_upgrade_status is 'upgrade_available'. */
export const IacUpgradeCallout: React.FC<IacUpgradeCalloutProps> = ({
  checkedAt,
  hasKey,
  canUpdate,
  isUpdating,
  onUpdateStack,
  onVerify,
  isVerifying,
}) => {
  const { IAC_UPGRADE_CALLOUT, IAC_UPDATE_STACK_BUTTON, IAC_VERIFY_BUTTON } =
    CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS;

  const bodyText = hasKey ? (
    <FormattedMessage
      id="xpack.fleet.cloudConnector.policiesFlyout.upgradeBody"
      defaultMessage="The IAM role template has been updated. Run the stack update to apply the latest permissions to this identity."
    />
  ) : (
    <FormattedMessage
      id="xpack.fleet.cloudConnector.policiesFlyout.upgradeStaticBody"
      defaultMessage="This identity uses the static CloudFormation template, either because it predates generated templates or because template generation was unavailable when it was created. Run the stack update to switch to a template scoped to its integrations' permissions."
    />
  );

  const text = (
    <>
      <p>{bodyText}</p>
      {!canUpdate && (
        <p>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.fleet.cloudConnector.policiesFlyout.updateStackNeedsDeploymentId"
              defaultMessage="Fill in the Deployment ID below first so Kibana can open your stack."
            />
          </EuiTextColor>
        </p>
      )}
      {checkedAt && (
        <p>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.fleet.cloudConnector.policiesFlyout.checkedAt"
              defaultMessage="Checked {when}"
              values={{ when: <FormattedRelative value={checkedAt} /> }}
            />
          </EuiTextColor>
        </p>
      )}
    </>
  );

  return (
    <KbnWarningCallout
      title={i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.upgradeTitle', {
        defaultMessage: 'CloudFormation stack update available',
      })}
      // Medium, not small: EUI renders a small callout's `text` inline (title · text), which
      // would run these paragraphs together on one line.
      size="m"
      announceOnMount
      data-test-subj={IAC_UPGRADE_CALLOUT}
      text={text}
      actionProps={{
        primary: {
          iconType: 'popout',
          isDisabled: !canUpdate,
          isLoading: isUpdating,
          onClick: onUpdateStack,
          'data-test-subj': IAC_UPDATE_STACK_BUTTON,
          children: (
            <FormattedMessage
              id="xpack.fleet.cloudConnector.policiesFlyout.updateStackButton"
              defaultMessage="Update CloudFormation stack"
            />
          ),
        },
        secondary: {
          iconType: 'refresh',
          isLoading: isVerifying,
          onClick: onVerify,
          'data-test-subj': IAC_VERIFY_BUTTON,
          children: (
            <FormattedMessage
              id="xpack.fleet.cloudConnector.policiesFlyout.verifyButton"
              defaultMessage="Verify"
            />
          ),
        },
      }}
    />
  );
};
