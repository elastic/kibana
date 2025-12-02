/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

interface InfoPanelProps {
  title: string;
  children: React.ReactNode;
}

export function InfoPanel({ title, children }: InfoPanelProps) {
  const { euiTheme } = useEuiTheme();

  const panelStyles = css`
    padding: 0;
    border-radius: 6px;
  `;

  const headerStyles = css`
    background: ${euiTheme.colors.backgroundBaseSubdued};
    padding: ${euiTheme.size.m};
    border-bottom: ${euiTheme.border.thin};
  `;

  const contentStyles = css`
    padding: ${euiTheme.size.m};
  `;

  return (
    <EuiPanel hasBorder borderRadius="none" css={panelStyles}>
      <EuiText size="s" css={[headerStyles, { fontWeight: euiTheme.font.weight.semiBold }]}>
        {title}
      </EuiText>
      <div css={contentStyles}>{children}</div>
    </EuiPanel>
  );
}
