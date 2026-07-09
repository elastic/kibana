/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const componentStyles = {
  wrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      // The header cancels the surrounding EuiPageSection's top/side padding itself (via
      // `padding={{ bleed: 'l' }}`), so only the bottom margin needs cancelling here for the
      // editor/preview split to reach the bottom edge with no wasted vertical space.
      marginBottom: `-${euiTheme.size.l}`,
    }),
  editorWrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      // Break out of the page's side gutter so the editor/preview split runs edge-to-edge,
      // matching the header's own bleed.
      marginInline: `-${euiTheme.size.l}`,
      overflow: 'hidden',
      minHeight: 0,
    }),
  pageTemplate: css({
    flexGrow: 0,
  }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      overflow: 'hidden',
      paddingTop: euiTheme.size.s,
      paddingBottom: euiTheme.size.base,
      // Keep header content comfortably inset now that the wrapper is full-bleed.
      paddingInline: euiTheme.size.l,
      borderBottom: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  headerSection: css({
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    width: '100%',
  }),
  skeletonTitle: css({
    minWidth: '250px',
    width: '100%',
    display: 'inline-block',
  }),
  title: css({
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'inline-block',
  }),
  titleItem: css({
    minWidth: 0,
    overflow: 'hidden',
  }),
  editorPanel: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      overflow: 'hidden',
      // Subtle surface behind the (transparent) code editor, matching the Workflows
      // YAML editor. Token-based, so it adapts to light and dark mode.
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    }),
  previewPanel: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      overflow: 'auto',
      padding: euiTheme.size.base,
      // Plain (default) surface for the form/preview side.
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
};
