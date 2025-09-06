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
    <div className="enterpriseSearchLoading" css={Styles.enterpriseSearchLoading(euiTheme)}>
      <EuiLoadingLogo size="xl" logo="logoElasticsearch" />
    </div>
  );
};

export const LoadingOverlay: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      className="enterpriseSearchLoadingOverlay"
      css={Styles.enterpriseSearchLoadingOverlay(euiTheme)}
    >
      <div css={Styles.enterpriseSearchLoading(euiTheme)}>
        <EuiLoadingSpinner size="xl" />
      </div>
    </div>
  );
};
