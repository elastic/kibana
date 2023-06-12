/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transparentize, type EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/css';

const EUI_HEADER_HEIGHT = '96px';
const PANEL_LEFT_OFFSET = '248px';
const PANEL_WIDTH = '340px';

export const panelClass = 'solutionSideNavPanel';

export const SolutionSideNavPanelStyles = (
  euiTheme: EuiThemeComputed<{}>,
  { $bottomOffset, $topOffset }: { $bottomOffset?: string; $topOffset?: string } = {}
) => css`
  position: fixed;
  top: ${$topOffset ?? EUI_HEADER_HEIGHT};
  left: ${PANEL_LEFT_OFFSET};
  bottom: 0;
  width: ${PANEL_WIDTH};
  height: inherit;
  z-index: 999;

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
    &:focus-within {
      background-color: transparent;
      a {
        text-decoration: auto;
      }
    }
    &:hover {
      background-color: ${transparentize(euiTheme.colors.primary, 0.1)};
      a {
        text-decoration: underline;
      }
    }
  }
`;

export const SolutionSideNavTitleStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  padding-left: ${euiTheme.size.s};
  padding-top: ${euiTheme.size.s};
`;

export const SolutionSideNavCategoryTitleStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  padding-left: ${euiTheme.size.s};
`;

export const SolutionSideNavCategoryAccordionStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  margin-bottom: ${euiTheme.size.s};
`;
