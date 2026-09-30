/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';

import type { VerifyCloudConnectorIacKeyResponse } from '../../../../common/types/rest_spec/cloud_connector';
import { CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';

export interface IacKeyCheckCalloutProps {
  result: VerifyCloudConnectorIacKeyResponse;
  /** How many integrations the check covers; pluralises the copy. */
  integrationCount?: number;
  onUpdateStack: () => void;
  isUpdating: boolean;
  /**
   * The user has launched the stack update for this verdict (`key_mismatch` or `no_key`, both
   * blocking). The callout switches to a "launched" state that tells them to finish in the AWS
   * console and continue; Update stays available to relaunch.
   */
  updateLaunched?: boolean;
}

/** Renders null when the IAC key matches or there is no actionable reason. */
export const IacKeyCheckCallout: React.FC<IacKeyCheckCalloutProps> = ({
  result,
  integrationCount = 1,
  onUpdateStack,
  isUpdating,
  updateLaunched = false,
}) => {
  if (result.matches || !result.reason) {
    return null;
  }

  // One message whether the stored key is missing (no_key) or mismatched: both mean the deployed
  // template does not cover the selection, and users are never told an identity "uses the static
  // template".
  const title = updateLaunched ? (
    <FormattedMessage
      id="xpack.fleet.cloudConnector.iacCheck.launchedTitle"
      defaultMessage="CloudFormation stack update opened"
    />
  ) : (
    <FormattedMessage
      id="xpack.fleet.cloudConnector.iacCheck.mismatchTitle"
      defaultMessage="CloudFormation stack update required"
    />
  );

  // The onboarding checks a whole package set, so there is no single title to name; the copy uses
  // a count-aware placeholder instead.
  const integration = (
    <strong>
      {i18n.translate('xpack.fleet.cloudConnector.iacCheck.integrationFallback', {
        defaultMessage: '{count, plural, one {this integration} other {these integrations}}',
        values: { count: integrationCount },
      })}
    </strong>
  );

  const bodyText = updateLaunched ? (
    <FormattedMessage
      id="xpack.fleet.cloudConnector.iacCheck.launchedBody"
      defaultMessage="Apply the update in the AWS console, then continue. The new services report once the stack is updated."
    />
  ) : (
    <FormattedMessage
      id="xpack.fleet.cloudConnector.iacCheck.mismatchBody"
      defaultMessage="This identity's IAM role was generated without the permissions needed for {integration}. Update the CloudFormation stack to grant the required permissions before completing setup."
      values={{ integration }}
    />
  );

  // Without the identity's stack ARN there is no stack to update: the only link Kibana could
  // build is quick-create, which makes a new stack and a new role the identity does not use. The
  // flyout on the identity's details captures the ARN (or launches a stack and records it), so
  // send the user there instead of offering an Update that cannot apply.
  const canUpdate = Boolean(result.deploymentId);

  const text = (
    <>
      <p>{bodyText}</p>
      {!canUpdate && (
        <p>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.fleet.cloudConnector.iacCheck.noDeploymentId"
              defaultMessage="The stack ARN for this identity isn't recorded, so Kibana cannot open its stack update. Add the stack ARN from the identity's details in Fleet, then come back to complete setup."
            />
          </EuiTextColor>
        </p>
      )}
    </>
  );

  return (
    <KbnWarningCallout
      title={title}
      // Medium, not small: EUI renders a small callout's `text` inline (title · text), which
      // would run these paragraphs together on one line.
      size="m"
      announceOnMount
      data-test-subj={CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.CALLOUT}
      text={text}
      {...(canUpdate
        ? {
            actionProps: {
              primary: {
                iconType: 'rocket',
                isLoading: isUpdating,
                onClick: onUpdateStack,
                'data-test-subj': CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.UPDATE_STACK_BUTTON,
                children: (
                  <FormattedMessage
                    id="xpack.fleet.cloudConnector.iacCheck.updateStackButton"
                    defaultMessage="Update CloudFormation stack"
                  />
                ),
              },
            },
          }
        : {})}
    />
  );
};
