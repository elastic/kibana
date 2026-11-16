/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { darken, type EuiThemeComputed } from '@elastic/eui';
import chroma from 'chroma-js';
import type { LifecycleTimelineGrid } from './types';

export const getContainerStyles = (euiTheme: EuiThemeComputed) =>
  css({
    containerType: 'inline-size',
    overflowX: 'auto',
    // Room for the labels centered on the first and last tick lines, which the scroll would clip.
    paddingInline: euiTheme.size.xs,
  });

const getGridStyles = (
  euiTheme: EuiThemeComputed,
  { gridTemplateColumns, narrow, minWidth }: LifecycleTimelineGrid
) =>
  css({
    display: 'grid',
    gridTemplateColumns,
    boxSizing: 'border-box',
    paddingInline: euiTheme.size.xxs,
    ...(minWidth && { minWidth: `calc(${minWidth} + 2 * ${euiTheme.size.xxs})` }),
    ...(narrow && {
      [`@container (max-width: ${narrow.maxWidthPx}px)`]: {
        gridTemplateColumns: narrow.gridTemplateColumns,
      },
    }),
  });

export const getTrackStyles = (euiTheme: EuiThemeComputed, grid: LifecycleTimelineGrid) => ({
  track: [
    getGridStyles(euiTheme, grid),
    css({
      listStyle: 'none',
      margin: 0,
      paddingBlock: euiTheme.size.xs,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      borderRadius: '8px',
    }),
  ],
  periodCell: css({
    minWidth: 0,
    paddingInline: euiTheme.size.xxs,
  }),
});

export const getTicksStyles = (euiTheme: EuiThemeComputed, grid: LifecycleTimelineGrid) => ({
  ticks: getGridStyles(euiTheme, grid),
  tickLine: css({
    height: '13px',
    borderRight: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
  }),
  firstTickLine: css({
    borderLeft: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
  }),
  tickLabels: css({
    paddingBlock: euiTheme.size.xs,
    whiteSpace: 'nowrap',
  }),
  startLabel: css({
    transform: 'translateX(-50%)',
  }),
  endLabel: css({
    transform: 'translateX(50%)',
  }),
});

const getTextColor = (euiTheme: EuiThemeComputed, backgroundColor: string) => {
  const { textInk, textGhost } = euiTheme.colors;
  if (!chroma.valid(backgroundColor)) return textInk;
  return chroma.contrast(textGhost, backgroundColor) > chroma.contrast(textInk, backgroundColor)
    ? textGhost
    : textInk;
};

export const getPeriodBarStyles = ({
  euiTheme,
  isDarkMode,
  backgroundColor,
  isHighlighted,
  isClickable,
}: {
  euiTheme: EuiThemeComputed;
  isDarkMode: boolean;
  backgroundColor: string;
  isHighlighted: boolean;
  isClickable: boolean;
}) => {
  const highlightColor = isDarkMode ? euiTheme.colors.plainLight : euiTheme.colors.plainDark;
  const ellipsis = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const;

  return {
    bar: css({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      boxSizing: 'border-box',
      width: '100%',
      minHeight: '48px',
      padding: euiTheme.size.s,
      border: 'none',
      margin: 0,
      font: 'inherit',
      textAlign: 'left',
      color: getTextColor(euiTheme, backgroundColor),
      backgroundColor,
      borderRadius: euiTheme.border.radius.small,
      boxShadow: isHighlighted ? `inset 0 0 0 2px ${highlightColor}` : 'none',
      transition: 'background-color 150ms ease-in-out',
      ...(isClickable && {
        cursor: 'pointer',
        ...(chroma.valid(backgroundColor) && {
          '&:hover': { backgroundColor: darken(backgroundColor, 0.07) },
        }),
      }),
    }),
    name: css({
      ...ellipsis,
      maxWidth: '100%',
      fontWeight: euiTheme.font.weight.semiBold,
    }),
    size: css({
      ...ellipsis,
      maxWidth: '100%',
    }),
  };
};
