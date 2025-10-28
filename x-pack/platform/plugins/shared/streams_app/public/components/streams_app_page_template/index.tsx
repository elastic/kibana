/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiPageSectionProps } from '@elastic/eui';
import { EuiPageTemplate } from '@elastic/eui';
import { css } from '@emotion/css';

export function StreamsAppPageTemplate({ children }: { children: React.ReactNode }) {
  return (
    <EuiPageTemplate
      offset={0}
      minHeight={0}
      restrictWidth={false}
      className={css`
        max-height: 100%;
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
  ...props
}: EuiPageSectionProps & { noPadding?: boolean }) => (
  <EuiPageTemplate.Section
    grow
    className={css`
      overflow-y: auto;
      padding-inline: ${noPadding ? '0px' : '24px'};
    `}
    contentProps={{
      className: css`
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        padding-block: ${noPadding ? '0px' : '24px'};
        height: 100%;
      `,
    }}
    {...props}
  />
);
