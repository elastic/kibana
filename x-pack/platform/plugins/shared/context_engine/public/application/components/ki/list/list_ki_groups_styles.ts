/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

const ROW_TITLE_LINE_HEIGHT = 1.4;

export const useListKiGroupsStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { fontSize, lineHeight } = useEuiFontSize('s');

  return useMemo(() => {
    const divider = `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`;
    const resetButton = {
      width: '100%',
      margin: 0,
      border: 'none',
      font: 'inherit',
      textAlign: 'left' as const,
      cursor: 'pointer',
      color: euiTheme.colors.textHeading,
    };

    return {
      groupHeader: css({
        ...resetButton,
        display: 'flex',
        alignItems: 'center',
        gap: euiTheme.size.s,
        padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        borderTop: divider,
        fontSize,
        lineHeight,
      }),
      firstGroupHeader: css({
        borderTop: 'none',
      }),
      groupName: css({
        fontWeight: euiTheme.font.weight.bold,
        color: euiTheme.colors.textHeading,
      }),
      groupCount: css({
        color: euiTheme.colors.textSubdued,
      }),
      row: css({
        ...resetButton,
        display: 'flex',
        flexDirection: 'column',
        gap: euiTheme.size.s,
        padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        borderTop: divider,
        fontSize,
        lineHeight,
        '&:hover': {
          backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
        },
      }),
      selectedRow: css({
        backgroundColor: euiTheme.colors.backgroundBaseInteractiveSelect,
        '&:hover': {
          backgroundColor: euiTheme.colors.backgroundBaseInteractiveSelect,
        },
      }),
      rowTitle: css({
        fontWeight: euiTheme.font.weight.semiBold,
        lineHeight: ROW_TITLE_LINE_HEIGHT,
        color: euiTheme.colors.textHeading,
        overflowWrap: 'anywhere',
      }),
      deletedRowTitle: css({
        textDecoration: 'line-through',
        color: euiTheme.colors.textSubdued,
      }),
      rowMeta: css({
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: euiTheme.size.s,
      }),
      rowUpdated: css({
        color: euiTheme.colors.textSubdued,
      }),
      groupFooter: css({
        display: 'flex',
        justifyContent: 'center',
        padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
        borderTop: divider,
      }),
    };
  }, [euiTheme, fontSize, lineHeight]);
};
