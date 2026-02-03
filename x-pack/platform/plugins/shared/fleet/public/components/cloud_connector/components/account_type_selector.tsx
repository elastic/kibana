/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { AccountType } from '../../../types';
import { ORGANIZATION_ACCOUNT, SINGLE_ACCOUNT } from '../constants';

export interface AccountTypeSelectorProps {
  /** Currently selected account type */
  selectedAccountType: AccountType;
  /** Callback when account type selection changes */
  onChange: (accountType: AccountType) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

const ACCOUNT_TYPE_OPTIONS = [
  {
    id: ORGANIZATION_ACCOUNT,
    label: i18n.translate('xpack.fleet.cloudConnector.accountTypeSelector.organizationLabel', {
      defaultMessage: 'Organization',
    }),
    'data-test-subj': 'cloudConnectorAccountTypeOrganization',
  },
  {
    id: SINGLE_ACCOUNT,
    label: i18n.translate('xpack.fleet.cloudConnector.accountTypeSelector.singleAccountLabel', {
      defaultMessage: 'Single Account',
    }),
    'data-test-subj': 'cloudConnectorAccountTypeSingleAccount',
  },
];

export const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = ({
  selectedAccountType,
  onChange,
  disabled = false,
}) => {
  const handleChange = (optionId: string) => {
    if (optionId === ORGANIZATION_ACCOUNT || optionId === SINGLE_ACCOUNT) {
      onChange(optionId);
    }
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.fleet.cloudConnector.accountTypeSelector.label', {
        defaultMessage: 'Cloud Connector Account Type',
      })}
      data-test-subj="cloudConnectorAccountTypeSelector"
    >
      <EuiRadioGroup
        options={ACCOUNT_TYPE_OPTIONS}
        idSelected={selectedAccountType}
        onChange={handleChange}
        disabled={disabled}
        name="cloudConnectorAccountType"
      />
    </EuiFormRow>
  );
};
