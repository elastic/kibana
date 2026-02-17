/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS } from '../../../../common';

import type { AccountType } from '../../../types';
import { ORGANIZATION_ACCOUNT, SINGLE_ACCOUNT } from '../constants';

import { BoxedRadioGroup, type BoxedRadioOption } from './boxed_radio_group';

export interface AccountTypeSelectorProps {
  /** Currently selected account type */
  selectedAccountType: AccountType;
  /** Callback when account type selection changes */
  onChange: (accountType: AccountType) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

const ACCOUNT_TYPE_OPTIONS: BoxedRadioOption[] = [
  {
    id: ORGANIZATION_ACCOUNT,
    label: i18n.translate('xpack.fleet.cloudConnector.accountTypeSelector.organizationLabel', {
      defaultMessage: 'Organization account',
    }),
    testId: ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.ORGANIZATION,
  },
  {
    id: SINGLE_ACCOUNT,
    label: i18n.translate('xpack.fleet.cloudConnector.accountTypeSelector.singleAccountLabel', {
      defaultMessage: 'Single account',
    }),
    testId: ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SINGLE_ACCOUNT,
  },
];

export const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = ({
  selectedAccountType,
  onChange,
  disabled = false,
}) => {
  return (
    <div data-test-subj={ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SELECTOR}>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.fleet.cloudConnector.accountTypeSelector.description"
          defaultMessage="Select between single account or organization account."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <BoxedRadioGroup
        disabled={disabled}
        idSelected={selectedAccountType}
        options={ACCOUNT_TYPE_OPTIONS}
        onChange={(id) => {
          if (id === ORGANIZATION_ACCOUNT || id === SINGLE_ACCOUNT) {
            onChange(id);
          }
        }}
        size="m"
        name="cloudConnectorAccountType"
      />
      {selectedAccountType === ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.fleet.cloudConnector.accountTypeSelector.organizationDescription"
              defaultMessage="Connect Elastic to every account (current and future) in your cloud organization by providing Elastic with read-only access."
            />
          </EuiText>
        </>
      )}
      {selectedAccountType === SINGLE_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.fleet.cloudConnector.accountTypeSelector.singleAccountDescription"
              defaultMessage="Deploying to a single account is suitable for an initial POC. To ensure complete coverage, it is recommended to deploy at the organization level."
            />
          </EuiText>
        </>
      )}
    </div>
  );
};
