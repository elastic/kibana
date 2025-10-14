/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLoadingLogo, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';

import * as Styles from './styles';

export const Loading: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div css={Styles.enterpriseSearchLoading(euiTheme)} data-test-subj="enterpriseSearchLoading">
      <EuiLoadingLogo size="xl" logo="logoElasticsearch" data-test-subj="euiLoadingLogo" />
    </div>
  );
};

export const LoadingOverlay: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={Styles.enterpriseSearchLoadingOverlay(euiTheme)}
      data-test-subj="enterpriseSearchLoadingOverlay"
    >
      <div css={Styles.enterpriseSearchLoading(euiTheme)}>
        <EuiLoadingSpinner size="xl" data-test-subj="euiLoadingSpinner" />
      </div>
    </div>
  );
};
