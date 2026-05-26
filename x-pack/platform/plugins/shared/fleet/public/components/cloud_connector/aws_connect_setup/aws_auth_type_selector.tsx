/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type AwsAuthType = 'identity_federation' | 'static_keys' | 'temporary_keys';

export const AWS_AUTH_TYPE_SELECTOR_TEST_SUBJ = 'awsAuthTypeSelector';
export const AWS_AUTH_TYPE_IF_CARD_TEST_SUBJ = 'awsAuthTypeCard-identity_federation';
export const AWS_AUTH_TYPE_STATIC_KEYS_CARD_TEST_SUBJ = 'awsAuthTypeCard-static_keys';
export const AWS_AUTH_TYPE_TEMPORARY_KEYS_CARD_TEST_SUBJ = 'awsAuthTypeCard-temporary_keys';

const OPTIONS = [
  {
    value: 'identity_federation' as AwsAuthType,
    text: i18n.translate('xpack.fleet.awsConnectSetup.authType.identityFederationLabel', {
      defaultMessage: 'Federated Identity (Recommended)',
    }),
  },
  {
    value: 'static_keys' as AwsAuthType,
    text: i18n.translate('xpack.fleet.awsConnectSetup.authType.staticKeysLabel', {
      defaultMessage: 'Static Keys',
    }),
  },
  {
    value: 'temporary_keys' as AwsAuthType,
    text: i18n.translate('xpack.fleet.awsConnectSetup.authType.temporaryKeysLabel', {
      defaultMessage: 'Temporary Keys',
    }),
  },
];

interface AwsAuthTypeSelectorProps {
  selectedAuthType: AwsAuthType;
  onChange: (authType: AwsAuthType) => void;
}

export const AwsAuthTypeSelector: React.FC<AwsAuthTypeSelectorProps> = ({
  selectedAuthType,
  onChange,
}) => {
  return (
    <EuiSelect
      options={OPTIONS}
      value={selectedAuthType}
      onChange={(e) => onChange(e.target.value as AwsAuthType)}
      data-test-subj={AWS_AUTH_TYPE_SELECTOR_TEST_SUBJ}
    />
  );
};
