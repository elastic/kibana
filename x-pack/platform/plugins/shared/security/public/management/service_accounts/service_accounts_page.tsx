/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { ServiceAccountsEmptyPrompt } from './service_accounts_empty_prompt';

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  border-block-end: ${euiTheme.border.thin};
`;

export interface ServiceAccountsPageProps {
  onCreateAccount: () => void;
}

export const ServiceAccountsPage = ({ onCreateAccount }: ServiceAccountsPageProps) => {
  return (
    <>
      <KibanaPageTemplate.Header
        css={headerStyles}
        pageTitle={i18n.translate('xpack.security.management.serviceAccounts.pageTitle', {
          defaultMessage: 'Service accounts',
        })}
        description={i18n.translate('xpack.security.management.serviceAccounts.pageDescription', {
          defaultMessage: 'Create a dedicated identity to execute workloads.',
        })}
        rightSideItems={[
          <EuiButton
            key="createAccount"
            color="text"
            iconType="plus"
            onClick={onCreateAccount}
            size="s"
            data-test-subj="serviceAccountsPageCreateButton"
          >
            {i18n.translate('xpack.security.management.serviceAccounts.createButton', {
              defaultMessage: 'Create account',
            })}
          </EuiButton>,
        ]}
      />
      <KibanaPageTemplate.Section alignment="center" grow>
        <ServiceAccountsEmptyPrompt onCreateAccount={onCreateAccount} />
      </KibanaPageTemplate.Section>
    </>
  );
};
