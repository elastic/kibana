/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiPanel,
  EuiText,
  euiOutline,
  useEuiTheme,
  useEuiYScrollWithShadows,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface ModalTableColumn<T> {
  id: string;
  name: string;
  render: (item: T) => ReactNode;
}

export interface ModalTableProps<T> {
  'aria-label': string;
  columns: ReadonlyArray<ModalTableColumn<T>>;
  items: readonly T[];
  getRowId: (item: T) => string;
  isNested?: boolean;
  'data-test-subj': string;
}

// Names can be long, so they wrap anywhere rather than widening their column.
const cellStyles = css`
  min-inline-size: 0;
  overflow-wrap: anywhere;
`;

// Not `EuiTable`, which draws a line under every row.
export const ModalTable = <T,>({
  'aria-label': ariaLabel,
  columns,
  items,
  getRowId,
  isNested = false,
  'data-test-subj': dataTestSubj,
}: ModalTableProps<T>) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  // Only the end fades, so the sticky headers stay fully visible.
  const scrollStyles = useEuiYScrollWithShadows({ side: 'end' });
  const inlinePadding = isNested ? 0 : euiTheme.size.base;

  const rows = items.map((item) => (
    <EuiFlexGroup
      key={getRowId(item)}
      role="row"
      gutterSize="s"
      responsive={false}
      css={{ paddingBlock: euiTheme.size.xs }}
      data-test-subj={`${dataTestSubj}Row`}
    >
      {columns.map(({ id, render }) => (
        <EuiFlexItem key={id} role="cell" css={cellStyles}>
          <EuiText size="xs">{render(item)}</EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ));

  return (
    <EuiPanel
      hasBorder={!isNested}
      hasShadow={false}
      color={isNested ? 'transparent' : 'plain'}
      paddingSize="none"
      // The scrolling panel can't draw its own focus ring: the sticky headers would cover it.
      css={css`
        &:has(> [role='table']:focus-visible) {
          ${euiOutline(euiThemeContext, 'outset')}
        }
      `}
      data-test-subj={dataTestSubj}
    >
      {/* The outer panel draws its border with a pseudo-element, so an inner panel scrolls. */}
      <EuiPanel
        role="table"
        aria-label={ariaLabel}
        tabIndex={0}
        color="transparent"
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        css={css`
          ${scrollStyles}
          max-block-size: ${euiTheme.base * (isNested ? 11 : 17)}px;
          padding: 0 ${inlinePadding} ${isNested ? 0 : euiTheme.size.m};
        `}
      >
        {/* Inside the scrolling area, so a scrollbar narrows the headers and the rows alike. */}
        <EuiFlexGroup
          role="row"
          gutterSize="s"
          responsive={false}
          css={css`
            position: sticky;
            inset-block-start: 0;
            padding-block: ${isNested ? 0 : euiTheme.size.base} ${euiTheme.size.s};
            background-color: ${euiTheme.colors.backgroundBasePlain};
          `}
        >
          {columns.map(({ id, name }) => (
            <EuiFlexItem key={id} role="columnheader" css={cellStyles}>
              <EuiFormLabel>{name}</EuiFormLabel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        {rows}
      </EuiPanel>
    </EuiPanel>
  );
};
