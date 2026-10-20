/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  AWS_AUTH_TYPE_SELECTOR_TEST_SUBJ,
  AWS_AUTH_TYPE_IF_CARD_TEST_SUBJ,
  AWS_AUTH_TYPE_STATIC_KEYS_CARD_TEST_SUBJ,
  AWS_AUTH_TYPE_TEMPORARY_KEYS_CARD_TEST_SUBJ,
} from './test_subjects';

export type AwsAuthType = 'identity_federation' | 'static_keys' | 'temporary_keys';

export {
  AWS_AUTH_TYPE_SELECTOR_TEST_SUBJ,
  AWS_AUTH_TYPE_IF_CARD_TEST_SUBJ,
  AWS_AUTH_TYPE_STATIC_KEYS_CARD_TEST_SUBJ,
  AWS_AUTH_TYPE_TEMPORARY_KEYS_CARD_TEST_SUBJ,
};

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
      defaultMessage: 'Static keys',
    }),
  },
  {
    value: 'temporary_keys' as AwsAuthType,
    text: i18n.translate('xpack.fleet.awsConnectSetup.authType.temporaryKeysLabel', {
      defaultMessage: 'Temporary keys',
    }),
  },
];

interface AwsAuthTypeSelectorProps {
  selectedAuthType: AwsAuthType;
  showIdentityFederation?: boolean;
  onChange: (authType: AwsAuthType) => void;
}

export const AwsAuthTypeSelector: React.FC<AwsAuthTypeSelectorProps> = ({
  selectedAuthType,
  showIdentityFederation = true,
  onChange,
}) => {
  const options = showIdentityFederation
    ? OPTIONS
    : OPTIONS.filter((o) => o.value !== 'identity_federation');
  return (
    <EuiSelect
      options={options}
      value={selectedAuthType}
      onChange={(e) => onChange(e.target.value as AwsAuthType)}
      aria-label={i18n.translate('xpack.fleet.awsConnectSetup.authType.selectorAriaLabel', {
        defaultMessage: 'Authentication method',
      })}
      data-test-subj={AWS_AUTH_TYPE_SELECTOR_TEST_SUBJ}
    />
  );
};
