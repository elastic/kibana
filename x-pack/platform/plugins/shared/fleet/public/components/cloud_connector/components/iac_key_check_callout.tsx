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
  integrationTitle?: string;
  onUpdateStack: () => void;
  isUpdating: boolean;
  onVerify: () => void;
  isVerifying: boolean;
}

/** Renders null when the IAC key matches or there is no actionable reason. */
export const IacKeyCheckCallout: React.FC<IacKeyCheckCalloutProps> = ({
  result,
  integrationTitle,
  onUpdateStack,
  isUpdating,
  onVerify,
  isVerifying,
}) => {
  if (result.matches || !result.reason) {
    return null;
  }

  const isNoKey = result.reason === 'no_key';

  const title = isNoKey ? (
    <FormattedMessage
      id="xpack.fleet.cloudConnector.iacCheck.noKeyTitle"
      defaultMessage="This identity uses the static CloudFormation template"
    />
  ) : (
    <FormattedMessage
      id="xpack.fleet.cloudConnector.iacCheck.mismatchTitle"
      defaultMessage="CloudFormation stack update required"
    />
  );

  const fallbackIntegrationTitle = i18n.translate(
    'xpack.fleet.cloudConnector.iacCheck.integrationFallback',
    { defaultMessage: 'this integration' }
  );

  const bodyText = isNoKey ? (
    <FormattedMessage
      id="xpack.fleet.cloudConnector.iacCheck.noKeyBody"
      defaultMessage="This identity was set up with the static template, either because it predates generated templates or because template generation was unavailable at the time. Update the stack to switch to a template scoped to your integrations' permissions. You can continue without updating."
    />
  ) : (
    <FormattedMessage
      id="xpack.fleet.cloudConnector.iacCheck.mismatchBody"
      defaultMessage="This identity's IAM role was generated without the permissions needed for {integration}. Update the CloudFormation stack to grant the required permissions before completing setup."
      values={{
        integration: <strong>{integrationTitle ?? fallbackIntegrationTitle}</strong>,
      }}
    />
  );

  const text = (
    <>
      <p>{bodyText}</p>
      {!result.deploymentId && (
        <p>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.fleet.cloudConnector.iacCheck.noDeploymentId"
              defaultMessage="The stack ARN for this identity isn't recorded, so the button opens the CloudFormation console. Select your stack there and apply the rendered template. You can add the stack ARN from the identity's details."
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
      actionProps={{
        primary: {
          iconType: 'popout',
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
        secondary: {
          iconType: 'refresh',
          isLoading: isVerifying,
          onClick: onVerify,
          'data-test-subj': CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.VERIFY_BUTTON,
          children: (
            <FormattedMessage
              id="xpack.fleet.cloudConnector.iacCheck.verifyButton"
              defaultMessage="Verify"
            />
          ),
        },
      }}
    />
  );
};
