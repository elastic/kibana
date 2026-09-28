/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { ServiceAccountsEmptyPrompt } from './service_accounts_empty_prompt';

export interface ServiceAccountsPageProps {
  canCreate: boolean;
  onCreateAccount: () => void;
}

export const ServiceAccountsPage = ({ canCreate, onCreateAccount }: ServiceAccountsPageProps) => {
  const menu: AppHeaderMenu | undefined = canCreate
    ? {
        primaryActionItem: {
          id: 'createAccount',
          label: i18n.translate('xpack.security.management.serviceAccounts.createButton', {
            defaultMessage: 'Create account',
          }),
          iconType: 'plusCircle',
          testId: 'serviceAccountsPageCreateButton',
          run: onCreateAccount,
        },
      }
    : undefined;

  return (
    <>
      <AppHeader
        title={i18n.translate('xpack.security.management.serviceAccounts.pageTitle', {
          defaultMessage: 'Service accounts',
        })}
        description={i18n.translate('xpack.security.management.serviceAccounts.pageDescription', {
          defaultMessage: 'Create a dedicated identity to execute workloads.',
        })}
        menu={menu}
        spacing="bleed"
      />
      <KibanaPageTemplate.Section alignment="center" grow>
        <ServiceAccountsEmptyPrompt canCreate={canCreate} onCreateAccount={onCreateAccount} />
      </KibanaPageTemplate.Section>
    </>
  );
};
