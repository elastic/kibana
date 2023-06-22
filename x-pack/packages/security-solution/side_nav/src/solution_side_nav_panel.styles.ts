/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transparentize, type EuiThemeComputed } from '@elastic/eui';
import { css, injectGlobal } from '@emotion/css';

const EUI_HEADER_HEIGHT = '93px';
const PANEL_LEFT_OFFSET = '248px';
const PANEL_WIDTH = '340px';

export const panelClass = 'solutionSideNavPanel';

export const SolutionSideNavPanelStyles = (
  euiTheme: EuiThemeComputed<{}>,
  { $bottomOffset, $topOffset }: { $bottomOffset?: string; $topOffset?: string } = {}
) => {
  // We need to add the banner height to the top space when the header banner is present
  injectGlobal(`
    body.kbnBody--hasHeaderBanner .${panelClass} {
      top: calc(${EUI_HEADER_HEIGHT} + ${euiTheme.size.xl});
    }
  `);

  return css`
    position: fixed;
    top: ${$topOffset ?? EUI_HEADER_HEIGHT};
    left: ${PANEL_LEFT_OFFSET};
    bottom: 0;
    width: ${PANEL_WIDTH};
    height: inherit;

    // If the bottom bar is visible add padding to the navigation
    ${$bottomOffset != null &&
    `
      height: inherit;
      bottom: ${$bottomOffset};
      box-shadow:
        // left
        -${euiTheme.size.s} 0 ${euiTheme.size.s} -${euiTheme.size.s} rgb(0 0 0 / 15%),
        // right
        ${euiTheme.size.s} 0 ${euiTheme.size.s} -${euiTheme.size.s} rgb(0 0 0 / 15%),
        // bottom inset to match timeline bar top shadow
        inset 0 -6px ${euiTheme.size.xs} -${euiTheme.size.xs} rgb(0 0 0 / 15%);
      `}

    .solutionSideNavPanelLink {
      .solutionSideNavPanelLinkItem {
        background-color: transparent; /* originally white, it prevents panel to remove the bottom inset box shadow */
        &:hover {
          background-color: ${transparentize(euiTheme.colors.primary, 0.1)};
        }
        dt {
          color: ${euiTheme.colors.primaryText};
        }
        dd {
          color: ${euiTheme.colors.darkestShade};
        }
      }
    }
  `;
};

export const SolutionSideNavTitleStyles = (
  euiTheme: EuiThemeComputed<{}>,
  { $paddingTop = false }: { $paddingTop?: boolean } = {}
) => css`
  padding-left: ${euiTheme.size.s};
  ${$paddingTop && `padding-top: ${euiTheme.size.s};`}
`;
