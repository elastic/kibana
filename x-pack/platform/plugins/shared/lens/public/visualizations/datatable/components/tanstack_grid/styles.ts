/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiDataGridStyle, UseEuiTheme } from '@elastic/eui';
import { euiFontSize, mathWithUnits } from '@elastic/eui';

const getCellPadding = (
  { euiTheme }: UseEuiTheme,
  cellPadding: EuiDataGridStyle['cellPadding']
) => {
  switch (cellPadding) {
    case 's':
      return euiTheme.size.xs;
    case 'l':
      return euiTheme.size.s;
    default:
      return mathWithUnits(euiTheme.size.m, (x) => x / 2);
  }
};

export const getGridStyles = (themeContext: UseEuiTheme, gridStyle: EuiDataGridStyle = {}) => {
  const { euiTheme } = themeContext;
  const { fontSize: fontSizeKey = 'm', cellPadding, border = 'all', header, footer } = gridStyle;
  // EuiDataGrid's font size and line height use different scales: its compact size is the `xs` font
  // size, its normal one the `s` font size with the `m` line height, which makes rows 36px high.
  const { fontSize } = euiFontSize(themeContext, fontSizeKey === 's' ? 'xs' : 's');
  const { lineHeight } = euiFontSize(themeContext, fontSizeKey === 's' ? 'xs' : 'm');
  const padding = getCellPadding(themeContext, cellPadding);
  const hasHorizontalBorder = border === 'all' || border === 'horizontal';
  const hasVerticalBorder = border === 'all';
  const borderStyle = `${euiTheme.border.width.thin} solid ${euiTheme.components.dataGridBorderColor}`;
  const strongBorderStyle = `${euiTheme.border.width.thick} solid ${euiTheme.colors.borderBasePlain}`;

  const getSectionStyle = (variant: EuiDataGridStyle['header'] | EuiDataGridStyle['footer']) => ({
    backgroundColor:
      variant === 'shade' ? euiTheme.colors.lightestShade : euiTheme.colors.backgroundBasePlain,
  });

  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      blockSize: '100%',
      minBlockSize: 0,
      fontSize,
      lineHeight,
    }),
    scroll: css({
      position: 'relative',
      flex: '1 1 auto',
      minBlockSize: 0,
      overflow: 'auto',
    }),
    stickyTop: css({ position: 'sticky', top: 0, zIndex: 2 }),
    row: css({
      display: 'flex',
      minInlineSize: 'var(--lnsTanStackGridMinWidth)',
      inlineSize: '100%',
      backgroundColor: euiTheme.components.dataGridRowBackground,
      ...(hasHorizontalBorder && { borderBottom: borderStyle }),
    }),
    rowStriped: css({
      backgroundColor: euiTheme.components.dataGridRowStripesBackgroundStriped,
    }),
    rowHover: css({
      '&:hover': { backgroundColor: euiTheme.components.dataGridRowBackgroundHover },
    }),
    headerRow: css({
      display: 'flex',
      minInlineSize: 'var(--lnsTanStackGridMinWidth)',
      inlineSize: '100%',
      fontWeight: euiTheme.font.weight.bold,
      ...getSectionStyle(header ?? 'shade'),
      borderBottom:
        header === 'underline' || header === 'shade' || header === undefined
          ? strongBorderStyle
          : borderStyle,
    }),
    footerRow: css({
      display: 'flex',
      minInlineSize: 'var(--lnsTanStackGridMinWidth)',
      inlineSize: '100%',
      position: 'sticky',
      bottom: 0,
      zIndex: 2,
      fontWeight: euiTheme.font.weight.bold,
      ...getSectionStyle(footer ?? 'overline'),
      borderTop: strongBorderStyle,
    }),
    virtualOuter: css({ position: 'relative', inlineSize: '100%' }),
    virtualInner: css({ position: 'absolute', top: 0, insetInlineStart: 0, inlineSize: '100%' }),
    cell: css({
      position: 'relative',
      boxSizing: 'border-box',
      minInlineSize: 0,
      padding,
      overflow: 'hidden',
      ...(hasVerticalBorder && { borderInlineEnd: borderStyle }),
      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.colors.primary}`,
        outlineOffset: `calc(-1 * ${euiTheme.focus.width})`,
      },
    }),
    headerCell: css({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      boxSizing: 'border-box',
      minInlineSize: 0,
      padding,
      overflow: 'hidden',
      ...(hasVerticalBorder && { borderInlineEnd: borderStyle }),
      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.colors.primary}`,
        outlineOffset: `calc(-1 * ${euiTheme.focus.width})`,
      },
    }),
    headerContent: css({
      flex: '1 1 auto',
      minInlineSize: 0,
      overflow: 'hidden',
    }),
    headerActions: css({
      display: 'flex',
      alignItems: 'center',
      flex: '0 0 auto',
      gap: euiTheme.size.xxs,
      marginInlineStart: 'auto',
      lineHeight: 0,
    }),
    // The menu button is revealed on hover and focus, and stays visible while its popover is open.
    // While hidden it takes no space, so right aligned header text reaches the edge of the cell.
    headerMenuButton: css({
      overflow: 'hidden',
      maxInlineSize: 0,
      opacity: 0,
      '.kbnLensTanStackGridHeaderCell:hover &, .kbnLensTanStackGridHeaderCell:focus-within &': {
        maxInlineSize: euiTheme.size.l,
        opacity: 1,
      },
    }),
    headerMenuButtonOpen: css({ maxInlineSize: euiTheme.size.l, opacity: 1 }),
    resizeHandle: css({
      position: 'absolute',
      top: 0,
      insetInlineEnd: 0,
      bottom: 0,
      inlineSize: euiTheme.size.m,
      cursor: 'col-resize',
      touchAction: 'none',
      '&::after': {
        content: '""',
        position: 'absolute',
        top: '20%',
        bottom: '20%',
        insetInlineStart: '50%',
        inlineSize: euiTheme.size.xxs,
        borderRadius: euiTheme.size.xs,
        backgroundColor: 'transparent',
      },
      '&:hover::after': { backgroundColor: euiTheme.colors.borderBasePlain },
    }),
    resizeHandleActive: css({
      '&::after': { backgroundColor: euiTheme.colors.primary },
    }),
    // Single line, truncated: the default when rows are not fitted to their content.
    contentSingleLine: css({
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    }),
    contentAuto: css({ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }),
    contentLineClamp: (lineCount: number) =>
      css({
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: lineCount,
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
      }),
  };
};

export type GridStyles = ReturnType<typeof getGridStyles>;
