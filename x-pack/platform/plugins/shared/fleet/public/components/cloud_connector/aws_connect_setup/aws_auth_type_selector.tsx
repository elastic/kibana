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

export interface AwsAuthTypeSelectorOption {
  value: string;
  text: string;
}

const DEFAULT_OPTIONS: AwsAuthTypeSelectorOption[] = [
  {
    value: 'identity_federation',
    text: i18n.translate('xpack.fleet.awsConnectSetup.authType.identityFederationLabel', {
      defaultMessage: 'Federated Identity (Recommended)',
    }),
  },
  {
    value: 'static_keys',
    text: i18n.translate('xpack.fleet.awsConnectSetup.authType.staticKeysLabel', {
      defaultMessage: 'Static keys',
    }),
  },
  {
    value: 'temporary_keys',
    text: i18n.translate('xpack.fleet.awsConnectSetup.authType.temporaryKeysLabel', {
      defaultMessage: 'Temporary keys',
    }),
  },
];

interface AwsAuthTypeSelectorProps {
  selectedAuthType: string;
  showIdentityFederation?: boolean;
  /** Override the full option list. When provided, `showIdentityFederation` is ignored. */
  options?: AwsAuthTypeSelectorOption[];
  onChange: (authType: string) => void;
  'data-test-subj'?: string;
}

export const AwsAuthTypeSelector: React.FC<AwsAuthTypeSelectorProps> = ({
  selectedAuthType,
  showIdentityFederation = true,
  options,
  onChange,
  'data-test-subj': dataTestSubj = AWS_AUTH_TYPE_SELECTOR_TEST_SUBJ,
}) => {
  const resolvedOptions =
    options ??
    (showIdentityFederation
      ? DEFAULT_OPTIONS
      : DEFAULT_OPTIONS.filter((o) => o.value !== 'identity_federation'));
  return (
    <EuiSelect
      options={resolvedOptions}
      value={selectedAuthType}
      onChange={(e) => onChange(e.target.value)}
      aria-label={i18n.translate('xpack.fleet.awsConnectSetup.authType.selectorAriaLabel', {
        defaultMessage: 'Authentication method',
      })}
      data-test-subj={dataTestSubj}
    />
  );
};
