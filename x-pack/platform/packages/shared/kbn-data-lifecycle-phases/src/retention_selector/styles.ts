/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

export type EuiTheme = EuiThemeComputed;

export const getRetentionSelectableRowStyles = ({
  euiTheme,
  showBorderBottom,
}: {
  euiTheme: EuiTheme;
  showBorderBottom: boolean;
}) => ({
  item: css`
    padding: ${euiTheme.size.s} ${euiTheme.size.l};
    ${showBorderBottom ? `border-bottom: ${euiTheme.border.thin};` : ''}

    /* Keep the row hover/focus styling independent from the inspect badge */
    &:has([data-test-subj^='retentionSelectableRowInspect-']:hover),
    &:has([data-test-subj^='retentionSelectableRowInspect-']:focus),
    &:has([data-test-subj^='retentionSelectableRowInspect-']:focus-visible) {
      background-color: transparent;
    }

    &:has([data-test-subj^='retentionSelectableRowInspect-']:hover) .euiListGroupItem__button:hover,
    &:has([data-test-subj^='retentionSelectableRowInspect-']:hover) .euiListGroupItem__button:focus,
    &:has([data-test-subj^='retentionSelectableRowInspect-']:focus) .euiListGroupItem__button:focus,
    &:has([data-test-subj^='retentionSelectableRowInspect-']:focus-visible)
      .euiListGroupItem__button:focus-visible {
      text-decoration: none;
    }
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
}: {
  euiTheme: EuiTheme;
  height?: number | 'full';
}) => ({
  paddedSection: css`
    padding: 0 ${euiTheme.size.l};
  `,
  scrollContainer: css`
    overflow-y: auto;
    min-height: 0;
    ${typeof height === 'number' ? `max-height: ${height}px;` : ''}
    ${height === 'full' ? 'height: 100%;' : ''}
  `,
  panelListPanel: css`
    overflow: hidden;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
  `,
  noOptionsText: css`
    padding: ${euiTheme.size.m} ${euiTheme.size.l};
  `,
});
