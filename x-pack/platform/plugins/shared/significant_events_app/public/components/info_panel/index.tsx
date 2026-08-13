/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

interface InfoPanelProps {
  title: string;
  headerRightContent?: React.ReactNode;
  children: React.ReactNode;
}

export function InfoPanel({ title, headerRightContent, children }: InfoPanelProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      borderRadius="none"
      css={css`
        padding: 0;
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <EuiText
        size="s"
        css={css`
          background: ${euiTheme.colors.backgroundBaseSubdued};
          padding: ${euiTheme.size.m};
          border-bottom: ${euiTheme.border.thin};
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={1}>{title}</EuiFlexItem>
          {headerRightContent && <EuiFlexItem grow={false}>{headerRightContent}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiText>
      <div
        css={css`
          padding: ${euiTheme.size.m};
        `}
      >
        {children}
      </div>
    </EuiPanel>
  );
}
