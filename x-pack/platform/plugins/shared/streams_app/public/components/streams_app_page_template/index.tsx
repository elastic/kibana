/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiPageSectionProps } from '@elastic/eui';
import { EuiPageTemplate } from '@elastic/eui';
import { css, cx } from '@emotion/css';

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
StreamsAppPageTemplate.Body = ({
  noPadding,
  className: consumerClassName,
  contentProps: consumerContentProps,
  ...props
}: EuiPageSectionProps & { noPadding?: boolean }) => (
  <EuiPageTemplate.Section
    {...props}
    grow
    paddingSize="none"
    className={cx(
      css`
        overflow-y: auto;
        ${noPadding ? 'padding: 0;' : 'padding: 0 12px 12px 12px;'}
      `,
      consumerClassName
    )}
    contentProps={{
      ...consumerContentProps,
      className: cx(
        css`
          display: flex;
          flex-direction: column;
          height: 100%;
          ${noPadding ? 'padding: 0;' : ''}
        `,
        consumerContentProps?.className
      ),
    }}
  />
);
