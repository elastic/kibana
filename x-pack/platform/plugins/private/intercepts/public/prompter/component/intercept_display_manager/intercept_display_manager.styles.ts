/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { type HttpStart } from '@kbn/core-http-browser';
import { euiCanAnimate, euiFlyoutSlideInRight, type UseEuiTheme } from '@elastic/eui';

const INTERCEPT_ILLUSTRATION_WIDTH = 89; // Magic number was provided by Ryan

export const styles = (
  euiTheme: UseEuiTheme['euiTheme'],
  staticAssetsHelper: HttpStart['staticAssets']
) => ({
  wrapper: css`
    position: fixed;
    inline-size: 400px;
    max-block-size: auto;
    z-index: ${euiTheme.levels.toast};
    inset-inline-end: ${euiTheme.size.l};
    inset-block-end: ${euiTheme.size.xxl};

    ${euiCanAnimate} {
      animation: ${euiFlyoutSlideInRight} ${euiTheme.animation.normal}
        ${euiTheme.animation.resistance};
    }
  `,

  stepContentBox: css`
    min-height: 112px;
    position: relative;
  `,

  startIllustration: css`
    background: var(
      --intercept-background,
      url(${staticAssetsHelper.getPluginAssetHref('communication.svg')})
    );
    background-size: ${INTERCEPT_ILLUSTRATION_WIDTH}px 64px;
    background-repeat: no-repeat;
    background-position: top ${euiTheme.size.base} right ${euiTheme.size.base};
  `,

  startContentBox: css({
    width: `calc(100% - ${INTERCEPT_ILLUSTRATION_WIDTH}px - ${euiTheme.size.base})`,
  }),

  stepFooterBox: css`
    border-top: ${euiTheme.border.thin};
  `,
});
