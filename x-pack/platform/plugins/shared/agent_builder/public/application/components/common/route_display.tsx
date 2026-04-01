/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const RouteDisplay: React.FC = () => {
  const location = useLocation();
  const params = useParams();
  const { euiTheme } = useEuiTheme();

  const containerStyles = css`
    padding: ${euiTheme.size.xl};
    height: 100%;
  `;

  const codeStyles = css`
    font-size: ${euiTheme.size.l};
    padding: ${euiTheme.size.m};
  `;

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      css={containerStyles}
      gutterSize="l"
    >
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2>Current Route</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCode css={codeStyles}>{location.pathname}</EuiCode>
      </EuiFlexItem>
      {Object.keys(params).length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <strong>Route params:</strong> {JSON.stringify(params)}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
