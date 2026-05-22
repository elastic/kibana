/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiPageSectionProps } from '@elastic/eui';
import { EuiPageTemplate, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { css as emotionCss } from '@emotion/react';
import type { AppHeaderProps } from '@kbn/app-header';
import { AppHeader } from '@kbn/app-header';

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

export const StreamsAppHeader = ({ fallback, ...props }: AppHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <AppHeader
      fallback={
        fallback === null
          ? null
          : {
              paddingSize: 'l',
              restrictWidth: false,
              bottomBorder: 'extended',
              color: 'plain',
              css: emotionCss`
                background: ${euiTheme.colors.backgroundBasePlain};
              `,
              ...fallback,
            }
      }
      {...props}
    />
  );
};

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
