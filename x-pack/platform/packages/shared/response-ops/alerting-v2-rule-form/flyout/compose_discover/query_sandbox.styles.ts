/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

/*
 * Below this container width the controls row cannot fit Search, the date picker, the 250px
 * time field and the ES|QL menu on one line. Search and the date picker then grow to fill the
 * first row alongside the menu, and the time field takes its own full-width second row.
 */
const COMPACT_CONTROLS_MAX_WIDTH = '560px';

const sandboxRootCss = css`
  display: flex;
  flex-direction: column;
  container-type: inline-size;
`;

const searchItemCss = css`
  @container (max-width: ${COMPACT_CONTROLS_MAX_WIDTH}) {
    flex-grow: 1;
  }
`;

// Takes twice Search's share of the free space so the Search button stays the smaller of the two.
const dateRangeItemCss = css`
  @container (max-width: ${COMPACT_CONTROLS_MAX_WIDTH}) {
    flex-grow: 2;
  }
`;

const timeFieldSelectCss = css`
  width: 250px;
  min-width: 0;

  @container (max-width: ${COMPACT_CONTROLS_MAX_WIDTH}) {
    width: auto;
    flex: 1 1 100%;
    order: 2;
  }
`;

const esqlMenuItemCss = css`
  margin-left: auto;

  @container (max-width: ${COMPACT_CONTROLS_MAX_WIDTH}) {
    order: 1;
  }
`;

const loadingCenterCss = css`
  min-height: 200px;
`;

const editorBodyCss = css`
  overflow: auto;
`;

export const useQuerySandboxStyles = ({ euiTheme }: UseEuiTheme) => {
  const headerBlockCss = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    margin-bottom: ${euiTheme.size.s};
  `;

  // Tighter space between the two rows once the time field drops to its own row.
  // `&&` outranks the flex group's own `gap` shorthand.
  const controlsRowCss = css`
    @container (max-width: ${COMPACT_CONTROLS_MAX_WIDTH}) {
      && {
        row-gap: ${euiTheme.size.xs};
      }
    }
  `;

  const resultsSectionCss = css`
    margin-top: ${euiTheme.size.s};
  `;

  /**
   * Drag handle under the Monaco viewport. Prefer this over CSS `resize` —
   * Monaco covers the native corner grip, so that handle is effectively unusable.
   * Negative horizontal margin spans the panel's paddingSize="m".
   */
  const editorResizeHandleCss = css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(100% + ${euiTheme.size.m} * 2);
    height: ${euiTheme.size.m};
    margin: ${euiTheme.size.xs} -${euiTheme.size.m} -${euiTheme.size.m};
    padding: 0;
    border: none;
    cursor: ns-resize;
    user-select: none;
    touch-action: none;
    color: ${euiTheme.colors.mediumShade};
    background: transparent;

    &:hover,
    &:focus-visible {
      color: ${euiTheme.colors.darkShade};
      background-color: ${euiTheme.colors.lightestShade};
    }

    &::before {
      content: '';
      width: ${euiTheme.size.xl};
      height: 2px;
      border-radius: 1px;
      background-color: currentColor;
      box-shadow: 0 3px 0 currentColor;
    }
  `;

  return {
    sandboxRootCss,
    headerBlockCss,
    editorBodyCss,
    editorResizeHandleCss,
    searchItemCss,
    dateRangeItemCss,
    controlsRowCss,
    timeFieldSelectCss,
    esqlMenuItemCss,
    loadingCenterCss,
    resultsSectionCss,
  };
};
