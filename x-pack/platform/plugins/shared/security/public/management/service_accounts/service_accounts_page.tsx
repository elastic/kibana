/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { ServiceAccountsEmptyPrompt } from './service_accounts_empty_prompt';

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  border-style: none;
`;

const headerLoadingContentStyles = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  inline-size: 100%;
`;

const headerLoadingLineStyles = css`
  background-color: #e6e9f1;
  block-size: 10px;
  border-radius: 12px;
`;

const headerLoadingPrimaryLineStyles = css`
  inline-size: calc(100% - 12px);
`;

const headerLoadingSecondaryLineStyles = css`
  inline-size: 424px;
  max-inline-size: 100%;
`;

export interface ServiceAccountsPageProps {
  onCreateAccount: () => void;
}

export const ServiceAccountsPage = ({ onCreateAccount }: ServiceAccountsPageProps) => (
  <>
    <KibanaPageTemplate.Header
      css={headerStyles}
      pageTitle={i18n.translate('xpack.security.management.serviceAccounts.pageTitle', {
        defaultMessage: 'Service accounts',
      })}
      description={
        <div aria-hidden="true" css={headerLoadingContentStyles}>
          <div css={[headerLoadingLineStyles, headerLoadingPrimaryLineStyles]} />
          <div css={[headerLoadingLineStyles, headerLoadingSecondaryLineStyles]} />
        </div>
      }
    />
    <KibanaPageTemplate.Section>
      <ServiceAccountsEmptyPrompt onCreateAccount={onCreateAccount} />
    </KibanaPageTemplate.Section>
  </>
);
