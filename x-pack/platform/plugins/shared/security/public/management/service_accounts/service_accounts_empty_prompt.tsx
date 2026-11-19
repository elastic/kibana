/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiImage } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';

import serviceAccountsEmptyIllustration from './assets/service_accounts_empty.svg';

export interface ServiceAccountsEmptyPromptProps {
  canCreate: boolean;
  onCreateAccount: () => void;
}

export const ServiceAccountsEmptyPrompt = ({
  canCreate,
  onCreateAccount,
}: ServiceAccountsEmptyPromptProps) => (
  <EuiEmptyPrompt
    data-test-subj="serviceAccountsEmptyPrompt"
    icon={
      <EuiImage
        size={160}
        alt=""
        src={serviceAccountsEmptyIllustration}
        data-test-subj="serviceAccountsEmptyPromptIllustration"
      />
    }
    title={
      <h2>
        {i18n.translate('xpack.security.management.serviceAccounts.emptyPrompt.title', {
          defaultMessage: 'No service accounts available',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.security.management.serviceAccounts.emptyPrompt.body', {
          defaultMessage: 'Create a dedicated identity to execute workloads.',
        })}
      </p>
    }
    actions={
      canCreate ? (
        <EuiButton
          fill
          onClick={onCreateAccount}
          data-test-subj="serviceAccountsEmptyPromptCreateButton"
        >
          {i18n.translate('xpack.security.management.serviceAccounts.emptyPrompt.createButton', {
            defaultMessage: 'Create account',
          })}
        </EuiButton>
      ) : undefined
    }
  />
);
