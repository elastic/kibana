/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiImage, EuiSpacer, EuiTitle, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css, type SerializedStyles } from '@emotion/react';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';

import { useKbnFullScreenBgCss } from '@kbn/css-utils/public/full_screen_bg_css';

interface Props {
  className?: string;
  title: React.ReactNode;
  logo?: string;
  cssStyles?: SerializedStyles;
}

export const AuthenticationStatePage: FC<PropsWithChildren<Props>> = (props) => {
  const kbnFullScreenBgCss = useKbnFullScreenBgCss();
  const theme = useEuiTheme();
  const { euiTheme } = theme;
  const euiBottomShadowM = useEuiShadow('m');

  return (
    <div css={kbnFullScreenBgCss} data-test-subj="secAuthenticationStatePage">
      <header
        data-test-subj="secAuthenticationStatePageHeader"
        css={css`
          position: relative;
          padding: ${euiTheme.size.xl};
          z-index: 10;
        `}
      >
        <div
          data-test-subj="secAuthenticationStatePageContent"
          css={css`
            position: relative;
            margin: auto;
            max-width: 460px;
            padding-left: ${euiTheme.size.xl};
            padding-right: ${euiTheme.size.xl};
            z-index: 10;
            text-align: center;
            ${props.cssStyles || ''}
          `}
        >
          <EuiSpacer size="xxl" />
          <span
            data-test-subj="secAuthenticationStatePageLogo"
            css={css`
              margin-bottom: ${euiTheme.size.xl};
              display: inline-block;
              ${euiBottomShadowM};
            `}
          >
            {props.logo ? (
              <EuiImage src={props.logo} size={40} alt={'logo'} />
            ) : (
              <EuiIcon type="logoElastic" size="xxl" />
            )}
          </span>
          <EuiTitle size="l">
            <h1>{props.title}</h1>
          </EuiTitle>
          <EuiSpacer size="xl" />
        </div>
      </header>
      <div
        css={css`
          position: relative;
          margin: auto;
          max-width: 460px;
          padding-left: ${euiTheme.size.xl};
          padding-right: ${euiTheme.size.xl};
          z-index: 10;
          text-align: center;
          ${props.cssStyles || ''}
        `}
      >
        {props.children}
      </div>
    </div>
  );
};
