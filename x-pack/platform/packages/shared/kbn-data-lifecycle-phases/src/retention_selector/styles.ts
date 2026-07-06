/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

export type EuiTheme = EuiThemeComputed;

export const getRetentionSelectableRowStyles = ({ euiTheme }: { euiTheme: EuiTheme }) => ({
  item: css`
    /*
     * Keep row-level styling minimal; list-level styling handles dividers so the
     * separator spans both the main button and the optional extra action.
     */
    width: 100%;
    padding: ${euiTheme.size.s} ${euiTheme.size.l};
  `,
  nameColumn: css`
    min-width: 0;
  `,
  nameText: css`
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `,
});

export const getRetentionSelectorStyles = ({
  euiTheme,
  height,
  nestedScrollHeight,
}: {
  euiTheme: EuiTheme;
  height?: number | 'full';
  nestedScrollHeight?: number;
}) => ({
  list: css`
    /*
     * Dividers + gutters live at the list level so the separator spans both the
     * main button and the optional extra action button.
     */
    // Needed so the line doesn't get cut off
    .euiListItemLayout__wrapper {
      border-bottom: ${euiTheme.border.thin};
      padding-right: ${euiTheme.size.l};
    }
    .euiListItemLayout__wrapper:last-child {
      border-bottom: none;
    }
  `,
  paddedSection: css`
    padding: 0 ${euiTheme.size.l};
  `,
  scrollContainer:
    typeof height === 'number'
      ? css`
          max-height: ${height}px;
          overflow-y: auto;
          min-height: 0;
        `
      : height === 'full'
      ? css`
          overflow-y: auto;
          min-height: 0;
          /*
             * The measured height caps the list so it fills the space down to the
             * bottom of the flyout body (which keeps its own scroll). Until the
             * measurement is available we fall back to a viewport-relative cap so
             * the list still gets its own scroll.
             */
          max-height: ${nestedScrollHeight !== undefined ? `${nestedScrollHeight}px` : '50vh'};
        `
      : undefined,
  panelListPanel: css`
    overflow: hidden;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
  `,
  noOptionsText: css`
    padding: ${euiTheme.size.m} ${euiTheme.size.l};
  `,
});
