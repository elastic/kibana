/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiCheckableCard, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export type AwsAuthType = 'identity_federation' | 'static_keys';

export const AWS_AUTH_TYPE_SELECTOR_TEST_SUBJ = 'awsAuthTypeSelector';
export const AWS_AUTH_TYPE_IF_CARD_TEST_SUBJ = 'awsAuthTypeCard-identity_federation';
export const AWS_AUTH_TYPE_STATIC_KEYS_CARD_TEST_SUBJ = 'awsAuthTypeCard-static_keys';

interface AwsAuthTypeSelectorProps {
  selectedAuthType: AwsAuthType;
  onChange: (authType: AwsAuthType) => void;
}

export const AwsAuthTypeSelector: React.FC<AwsAuthTypeSelectorProps> = ({
  selectedAuthType,
  onChange,
}) => {
  return (
    <EuiFlexGroup
      gutterSize="m"
      direction="column"
      data-test-subj={AWS_AUTH_TYPE_SELECTOR_TEST_SUBJ}
    >
      <EuiFlexItem>
        <EuiCheckableCard
          id="awsAuthType-identity_federation"
          data-test-subj={AWS_AUTH_TYPE_IF_CARD_TEST_SUBJ}
          checked={selectedAuthType === 'identity_federation'}
          onChange={() => onChange('identity_federation')}
          label={
            <>
              <strong>
                <FormattedMessage
                  id="xpack.fleet.awsConnectSetup.authType.identityFederationLabel"
                  defaultMessage="Federated Identity"
                />{' '}
                <EuiBadge color="success">
                  <FormattedMessage
                    id="xpack.fleet.awsConnectSetup.authType.recommendedBadge"
                    defaultMessage="Recommended"
                  />
                </EuiBadge>
              </strong>
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.fleet.awsConnectSetup.authType.identityFederationDescription"
                    defaultMessage="Grant Elastic temporary access to your AWS account via an IAM role — no long-lived credentials stored."
                  />
                </p>
              </EuiText>
            </>
          }
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCheckableCard
          id="awsAuthType-static_keys"
          data-test-subj={AWS_AUTH_TYPE_STATIC_KEYS_CARD_TEST_SUBJ}
          checked={selectedAuthType === 'static_keys'}
          onChange={() => onChange('static_keys')}
          label={
            <>
              <strong>
                <FormattedMessage
                  id="xpack.fleet.awsConnectSetup.authType.staticKeysLabel"
                  defaultMessage="Static AWS Keys"
                />
              </strong>
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.fleet.awsConnectSetup.authType.staticKeysDescription"
                    defaultMessage="Use an IAM user access key and secret. Suitable when Identity Federation is not available in your environment."
                  />
                </p>
              </EuiText>
            </>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
