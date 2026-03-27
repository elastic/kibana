/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiPageSectionProps, EuiPageSidebarProps } from '@elastic/eui';
import { EuiPageTemplate } from '@elastic/eui';
import { css } from '@emotion/css';

export function StreamsAppPageTemplate({ children }: { children: React.ReactNode }) {
  return (
    <EuiPageTemplate
      offset={0}
      minHeight={0}
      restrictWidth={false}
      className={css`
        height: 0;
      `}
    >
      {children}
    </EuiPageTemplate>
  );
}

StreamsAppPageTemplate.Header = EuiPageTemplate.Header;
StreamsAppPageTemplate.EmptyPrompt = EuiPageTemplate.EmptyPrompt;
StreamsAppPageTemplate.Sidebar = ({
  children,
  ...props
}: EuiPageSidebarProps & { children: React.ReactNode }) => (
  <EuiPageTemplate.Sidebar
    className={css`
      border-right: 1px solid var(--euiBorderColor, #e0e5ee);
      overflow-y: auto;
    `}
    {...props}
  >
    {children}
  </EuiPageTemplate.Sidebar>
);
StreamsAppPageTemplate.Body = ({
  noPadding,
  grow = true,
  ...props
}: EuiPageSectionProps & { noPadding?: boolean; grow?: boolean }) => (
  <EuiPageTemplate.Section
    grow={grow}
    className={css`
      overflow-y: auto;
      min-height: 0;
      ${noPadding ? 'padding: 0px;' : ''}
    `}
    contentProps={{
      className: css`
        display: flex;
        flex-direction: column;
        height: 100%;
        ${noPadding ? 'padding: 0px;' : ''}
      `,
    }}
    {...props}
  />
);
