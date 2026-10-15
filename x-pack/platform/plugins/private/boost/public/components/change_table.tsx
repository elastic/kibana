/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiText,
  useEuiOverflowScroll,
  useEuiTheme,
} from '@elastic/eui';

export interface ChangeTableRow {
  id: string;
  cells: readonly ReactNode[];
}

type ChangeTableProps = (
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-labelledby': string; 'aria-label'?: never }
) & {
  columns: readonly string[];
  rows: readonly ChangeTableRow[];
  /**
   * The rows' tallest height, past which they scroll under the column headers. Set when the table
   * is a list of its own rather than part of one.
   */
  maxHeight?: number;
};

/**
 * Indices or data streams and what changes for each. Built from flex layout with table roles, so it
 * can scroll its rows under fixed column headers.
 */
export const ChangeTable = ({ columns, rows, maxHeight, ...labelProps }: ChangeTableProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useEuiOverflowScroll('y', true);
  const isScrollable = maxHeight !== undefined;
  // Names can be long, so a cell wraps anywhere rather than widening its column.
  const cellStyles = { minInlineSize: 0, overflowWrap: 'anywhere' } as const;

  const body = rows.map(({ id, cells }) => (
    <EuiFlexGroup
      key={id}
      role="row"
      gutterSize="s"
      responsive={false}
      css={{ paddingBlock: euiTheme.size.xs }}
    >
      {cells.map((cell, index) => (
        <EuiFlexItem key={index} role="cell" css={cellStyles}>
          <EuiText size="xs">{cell}</EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ));

  return (
    <div role="table" {...labelProps}>
      <div role="rowgroup">
        <EuiFlexGroup
          role="row"
          gutterSize="s"
          responsive={false}
          // Rows that scroll start below the area's padding, which takes the place of the
          // headers' bottom padding.
          css={
            isScrollable
              ? { padding: `${euiTheme.size.s} ${euiTheme.size.s} 0` }
              : { paddingBlockEnd: euiTheme.size.xs }
          }
        >
          {columns.map((column) => (
            <EuiFlexItem key={column} role="columnheader" css={cellStyles}>
              <EuiFormLabel>{column}</EuiFormLabel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
      {isScrollable ? (
        // The scroll mask fades the area's first and last 8px, which its padding keeps clear.
        <div
          role="rowgroup"
          tabIndex={0}
          css={css`
            ${scrollStyles}
            max-block-size: ${maxHeight}px;
            padding: ${euiTheme.size.s};
          `}
        >
          {body}
        </div>
      ) : (
        <div role="rowgroup">{body}</div>
      )}
    </div>
  );
};
