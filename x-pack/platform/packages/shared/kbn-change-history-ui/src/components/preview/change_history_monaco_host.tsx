/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RefObject } from 'react';
import React from 'react';

import type { UseEuiTheme } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

import type { ChangeHistoryDiffViewMode } from '../../telemetry';
import { buildChangeHistoryUnifiedDiffLayoutStyles } from './change_history_unified_diff_layout';

export interface ChangeHistoryMonacoHostProps {
  containerRef: RefObject<HTMLDivElement>;
  compareMode: ChangeHistoryDiffViewMode;
  isCompareMode: boolean;
  'data-test-subj'?: string;
}

const monacoDiffPreviewStyles = {
  monacoHost: (themeContext: UseEuiTheme) =>
    css`
      flex: 1 1 auto;
      min-height: 0;
      height: 100%;
      padding: 0 ${themeContext.euiTheme.size.m};
      & > div {
        height: 100%;
      }

      /* Monaco draws its own scrollbars; match EUI's thin, rounded scrollbar. */
      .monaco-scrollable-element > .scrollbar > .slider {
        width: calc(${themeContext.euiTheme.size.s} * 0.75) !important;
        border-radius: ${themeContext.euiTheme.border.radius.medium} !important;
        margin-right: 2px;
      }
    `,
  unifiedDiffLayout: css(buildChangeHistoryUnifiedDiffLayoutStyles()),
  monacoHostSplit: css({
    padding: 0,
  }),
  monacoHostUnified: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingLeft: `calc(${euiTheme.size.m} + ${euiTheme.size.s})`,
    }),
};

export const ChangeHistoryMonacoHost = ({
  containerRef,
  compareMode,
  isCompareMode,
  'data-test-subj': dataTestSubj = 'changeHistoryMonacoPreview',
}: ChangeHistoryMonacoHostProps): JSX.Element => {
  const styles = useMemoCss(monacoDiffPreviewStyles);

  return (
    <EuiText
      component="div"
      css={[
        styles.monacoHost,
        styles.unifiedDiffLayout,
        isCompareMode && compareMode === 'split' ? styles.monacoHostSplit : undefined,
        isCompareMode && compareMode === 'unified' ? styles.monacoHostUnified : undefined,
      ]}
    >
      <div ref={containerRef} data-test-subj={`${dataTestSubj}Editor`} />
    </EuiText>
  );
};
