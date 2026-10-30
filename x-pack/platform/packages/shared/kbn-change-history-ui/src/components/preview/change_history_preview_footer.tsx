/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

/** Collapsed footer row height. */
export const CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT = '48px';

const previewFooterStyles = {
  bar: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      width: '100%',
      minHeight: CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT,
      borderTop: euiTheme.border.thin,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    }),
  actions: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      top: 0,
      right: euiTheme.size.m,
      display: 'flex',
      alignItems: 'center',
      height: CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT,
    }),
};

/**
 * Footer bar hosting `children`, which can grow taller than the collapsed row (e.g. an accordion).
 * `actions` stay pinned to the top-right of the first row.
 */
export const ChangeHistoryPreviewFooter = ({
  children,
  actions,
  'data-test-subj': dataTestSubj,
}: {
  children?: ReactNode;
  actions?: ReactNode;
  'data-test-subj'?: string;
}): JSX.Element => {
  const styles = useMemoCss(previewFooterStyles);

  return (
    <div css={styles.bar} data-test-subj={dataTestSubj}>
      {children}
      {actions ? <div css={styles.actions}>{actions}</div> : null}
    </div>
  );
};
