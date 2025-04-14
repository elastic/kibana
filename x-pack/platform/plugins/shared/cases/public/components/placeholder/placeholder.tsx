/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

interface PlaceHolderProps {
  height?: number;
}

const panelCss = (height: number) => css`
  height: ${height}px;
`;

export const PlaceHolder: React.FC<PlaceHolderProps> = ({ height = 250 }) => {
  return (
    <EuiPanel color="primary" paddingSize="l" css={panelCss(height)} grow={false}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceAround" css={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>{'Solution placeholder'}</h1>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

PlaceHolder.displayName = 'PlaceHolder';
