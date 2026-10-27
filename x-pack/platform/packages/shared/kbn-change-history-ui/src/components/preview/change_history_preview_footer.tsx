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
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT,
      borderTop: euiTheme.border.thin,
      padding: `0 ${euiTheme.size.m}`,
    }),
  spacer: ({ euiTheme }: UseEuiTheme) =>
    css({
      minHeight: CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT,
      borderTop: euiTheme.border.thin,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    }),
};

/** Empty footer bar. Render it from `renderFooter` when there is nothing to show in the footer. */
export const ChangeHistoryPreviewFooterSpacer = (): JSX.Element => {
  const styles = useMemoCss(previewFooterStyles);

  return <div css={styles.spacer} aria-hidden={true} />;
};

/** Footer bar hosting `children` (e.g. a mode toggle); used by `ChangeHistoryPreview` and by consumers that render their own content. */
export const ChangeHistoryPreviewFooter = ({
  children,
  'data-test-subj': dataTestSubj,
}: {
  children?: ReactNode;
  'data-test-subj'?: string;
}): JSX.Element => {
  const styles = useMemoCss(previewFooterStyles);

  return (
    <div css={styles.bar} data-test-subj={dataTestSubj}>
      {children}
    </div>
  );
};
