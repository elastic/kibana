/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

const panelStyles = css`
  width: 740px;
`;

export interface PromptLayoutProps {
  imageSrc: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  primaryButton: React.ReactNode;
  secondaryButton?: React.ReactNode;
}

export const PromptLayout: React.FC<PromptLayoutProps> = ({
  imageSrc,
  title,
  subtitle,
  primaryButton,
  secondaryButton,
}) => (
  <EuiFlexGroup direction="column" justifyContent="center" alignItems="center">
    <EuiPanel css={panelStyles} hasShadow={true} paddingSize="l" grow={false}>
      <EuiFlexGroup direction="column" alignItems="center" justifyContent="center" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiImage src={imageSrc} alt="" size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" textAlign="center">
            {subtitle}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" justifyContent="center" direction="column">
            <EuiFlexItem grow={false}>{primaryButton}</EuiFlexItem>
            {secondaryButton && <EuiFlexItem grow={false}>{secondaryButton}</EuiFlexItem>}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  </EuiFlexGroup>
);
