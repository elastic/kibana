/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS } from '../../../../common';

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
    'data-test-subj': ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.ORGANIZATION,
  },
  {
    id: SINGLE_ACCOUNT,
    label: i18n.translate('xpack.fleet.cloudConnector.accountTypeSelector.singleAccountLabel', {
      defaultMessage: 'Single account',
    }),
    'data-test-subj': ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SINGLE_ACCOUNT,
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
        defaultMessage: 'Cloud connector account type',
      })}
      data-test-subj={ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SELECTOR}
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
