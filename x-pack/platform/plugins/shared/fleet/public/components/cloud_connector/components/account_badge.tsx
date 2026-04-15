/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { AccountType } from '../../../../common/types';
import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '../../../../common';

interface AccountBadgeProps {
  accountType?: AccountType;
  variant?: 'default' | 'flyout';
}

export const AccountBadge: React.FC<AccountBadgeProps> = ({ accountType, variant = 'default' }) => {
  if (!accountType) {
    return null;
  }

  const color = variant === 'flyout' ? 'default' : 'hollow';

  let label: string;
  if (accountType === SINGLE_ACCOUNT) {
    label = i18n.translate('xpack.fleet.cloudConnector.accountBadge.singleAccount', {
      defaultMessage: 'Single Account',
    });
  } else if (accountType === ORGANIZATION_ACCOUNT) {
    label = i18n.translate('xpack.fleet.cloudConnector.accountBadge.organization', {
      defaultMessage: 'Organization',
    });
  } else {
    // Fallback for unknown account types
    label = accountType;
  }

  return <EuiBadge color={color}>{label}</EuiBadge>;
};
