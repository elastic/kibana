/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

import { CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';

export interface IacUpgradeCalloutProps {
  checkedAt?: string;
  canUpdate: boolean;
  isUpdating: boolean;
  onUpdateStack: () => void;
}

/**
 * Upgrade callout shown in the connector flyout when iac_upgrade_status is 'upgrade_available'.
 * One message whether the stored key is missing or mismatched: users are never told an identity
 * "uses the static template". Its only action is Update: the click stores the rendered key and
 * the flyout re-checks on its own, so the callout clears itself.
 */
export const IacUpgradeCallout: React.FC<IacUpgradeCalloutProps> = ({
  checkedAt,
  canUpdate,
  isUpdating,
  onUpdateStack,
}) => {
  const { IAC_UPGRADE_CALLOUT, IAC_UPDATE_STACK_BUTTON } =
    CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS;

  const text = (
    <>
      <p>
        <FormattedMessage
          id="xpack.fleet.cloudConnector.policiesFlyout.upgradeBody"
          defaultMessage="The IAM role template has been updated. Run the stack update to apply the latest permissions to this identity."
        />
      </p>
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
            {/* Absolute first: "1 second ago" alone hides whether this is the daily task's
                verdict or the re-check that just ran. */}
            <FormattedMessage
              id="xpack.fleet.cloudConnector.policiesFlyout.checkedAt"
              defaultMessage="Checked {when} ({ago})"
              values={{
                when: (
                  <FormattedDate
                    value={checkedAt}
                    year="numeric"
                    month="short"
                    day="numeric"
                    hour="numeric"
                    minute="numeric"
                    second="numeric"
                  />
                ),
                ago: <FormattedRelative value={checkedAt} />,
              }}
            />
          </EuiTextColor>
        </p>
      )}
    </>
  );

  return (
    <KbnWarningCallout
      title={i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.upgradeTitle', {
        defaultMessage: 'CloudFormation stack upgrade available',
      })}
      // Medium, not small: EUI renders a small callout's `text` inline (title · text), which
      // would run these paragraphs together on one line.
      size="m"
      announceOnMount
      data-test-subj={IAC_UPGRADE_CALLOUT}
      text={text}
      actionProps={{
        primary: {
          iconType: 'rocket',
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
      }}
    />
  );
};
