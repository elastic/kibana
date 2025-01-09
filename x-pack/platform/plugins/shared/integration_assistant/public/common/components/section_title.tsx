/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';

const contentCss = css`
  width: 100%;
  max-width: 47em;
`;
const titleCss = css`
  text-align: center;
`;

export interface SectionTitleProps {
  title: string;
  description?: string;
}
export const SectionTitle = React.memo<SectionTitleProps>(({ title, description }) => {
  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiFlexItem css={contentCss}>
        <EuiTitle size="l">
          <h1 css={titleCss}>{title}</h1>
        </EuiTitle>
      </EuiFlexItem>
      {description && (
        <EuiFlexItem css={contentCss}>
          <EuiText size="s" textAlign="center" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
SectionTitle.displayName = 'SectionTitle';
