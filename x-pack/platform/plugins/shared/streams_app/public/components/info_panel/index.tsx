/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

interface InfoPanelProps {
  title: string;
  children: React.ReactNode;
}

export function InfoPanel({ title, children }: InfoPanelProps) {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => ({
      panel: css`
        padding: 0;
        border-radius: 6px;
      `,
      header: css`
        background: ${euiTheme.colors.backgroundBaseSubdued};
        padding: ${euiTheme.size.m};
        border-bottom: ${euiTheme.border.thin};
      `,
      content: css`
        padding: ${euiTheme.size.m};
      `,
    }),
    [euiTheme]
  );

  return (
    <EuiPanel hasBorder borderRadius="none" css={styles.panel}>
      <EuiText size="s" css={[styles.header, { fontWeight: euiTheme.font.weight.semiBold }]}>
        {title}
      </EuiText>
      <div css={styles.content}>{children}</div>
    </EuiPanel>
  );
}
