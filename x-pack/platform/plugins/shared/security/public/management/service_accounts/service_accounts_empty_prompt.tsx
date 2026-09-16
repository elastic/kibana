/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiImage } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { i18n } from '@kbn/i18n';

import serviceAccountsEmptyIllustration from './assets/service_accounts_empty.svg';

const emptyPromptStyles = css`
  align-items: center;
  display: flex;
  flex-direction: column;
  margin-block-start: 150px;
`;

const loadingContentStyles = css`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  inline-size: 424px;
  margin-block-start: 16px;
  max-inline-size: 100%;
`;

const loadingLineStyles = css`
  background-color: #e6e9f1;
  block-size: 10px;
  border-radius: 12px;
  inline-size: 100%;
`;

const createButtonStyles = css`
  inline-size: 171px;
  margin-block-start: 27px;
`;

export interface ServiceAccountsEmptyPromptProps {
  onCreateAccount: () => void;
}

export const ServiceAccountsEmptyPrompt = ({
  onCreateAccount,
}: ServiceAccountsEmptyPromptProps) => (
  <div data-test-subj="serviceAccountsEmptyPrompt" css={emptyPromptStyles}>
    <EuiImage
      size={256}
      alt=""
      src={serviceAccountsEmptyIllustration}
      data-test-subj="serviceAccountsEmptyPromptIllustration"
    />
    <div aria-hidden="true" css={loadingContentStyles}>
      <div css={loadingLineStyles} data-test-subj="serviceAccountsEmptyPromptLoadingLine" />
      <div css={loadingLineStyles} data-test-subj="serviceAccountsEmptyPromptLoadingLine" />
    </div>
    <EuiButton
      fill
      color="text"
      size="s"
      iconType="plus"
      css={createButtonStyles}
      onClick={onCreateAccount}
      data-test-subj="serviceAccountsEmptyPromptCreateButton"
    >
      {i18n.translate('xpack.security.management.serviceAccounts.emptyPrompt.createButton', {
        defaultMessage: 'Create account',
      })}
    </EuiButton>
  </div>
);
