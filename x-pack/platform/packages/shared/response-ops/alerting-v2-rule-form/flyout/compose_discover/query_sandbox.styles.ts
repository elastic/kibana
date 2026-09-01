/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

const sandboxRootCss = css`
  display: flex;
  flex-direction: column;
`;

const timeFieldSelectCss = css`
  width: 250px;
  min-width: 0;
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
    timeFieldSelectCss,
    loadingCenterCss,
    resultsSectionCss,
  };
};
