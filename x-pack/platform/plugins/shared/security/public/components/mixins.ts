/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiCanAnimate, type EuiThemeComputed } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

import {
  bg_bottom_branded,
  bg_bottom_branded_dark,
  bg_top_branded,
  bg_top_branded_dark,
} from '@kbn/core/public';

const kibanaFullScreenGraphicsFadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export const kibanaFullScreenGraphicsCss = ({
  darkMode = false,
  euiTheme,
}: {
  darkMode?: boolean;
  euiTheme: EuiThemeComputed;
}) => css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: calc(${euiTheme.levels.toast} + 1000);
  background: inherit;
  background-color: transparent;
  opacity: 0;
  overflow: auto;
  ${euiCanAnimate} {
    animation: ${kibanaFullScreenGraphicsFadeIn} ${euiTheme.animation.slow}
      ${euiTheme.animation.resistance} 0s forwards;
  }

  .kbnBody--hasHeaderBanner & {
    top: var(--kbnHeaderBannerHeight);
  }

  &::before {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1;
    width: 400px;
    height: 400px;
    content: url('${darkMode ? bg_top_branded_dark : bg_top_branded}');
  }

  &::after {
    position: fixed;
    bottom: 0;
    right: 0;
    z-index: 1;
    width: 400px;
    height: 400px;
    content: url('${darkMode ? bg_bottom_branded_dark : bg_bottom_branded}');
  }

  @media only screen and (max-width: ${euiTheme.breakpoint.l}) {
    &::before,
    &::after {
      content: none;
    }
  }
`;
