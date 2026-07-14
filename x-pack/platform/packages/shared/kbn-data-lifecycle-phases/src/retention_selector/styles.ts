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
  paddedSection: css`
    padding: 0 ${euiTheme.size.l};
  `,
  selectable: css`
    .euiSelectableListItem {
      padding-block: ${euiTheme.size.s};
    }

    /*
     * EUI's text column is flex-grow:1 but has no min-width, so a long,
     * unbroken option name keeps its intrinsic width and pushes the append
     * action (e.g. the inspect button) out of the row. Allowing it to shrink
     * lets the row's own ellipsis styles truncate the name. We can't use
     * listProps.textWrap="truncate" here because that collapses the whole
     * multi-line row (name + description) onto a single truncated line.
     */
    .euiSelectableListItem__text {
      padding-block: 0;
      min-width: 0;
    }
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
