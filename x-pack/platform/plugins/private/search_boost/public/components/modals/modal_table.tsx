/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiPanel,
  EuiText,
  useEuiFocusRing,
  useEuiOverflowScroll,
  useEuiTheme,
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
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useEuiOverflowScroll('y', true);
  const focusRingStyles = useEuiFocusRing('inset');
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
      role="table"
      aria-label={ariaLabel}
      hasBorder={!isNested}
      hasShadow={false}
      color={isNested ? 'transparent' : 'plain'}
      paddingSize="none"
      data-test-subj={dataTestSubj}
    >
      {/* The scrolling area's top padding replaces the headers' bottom padding. */}
      <EuiFlexGroup
        role="row"
        gutterSize="s"
        responsive={false}
        css={{
          paddingBlockStart: isNested ? 0 : euiTheme.size.base,
          paddingInline: inlinePadding,
        }}
      >
        {columns.map(({ id, name }) => (
          <EuiFlexItem key={id} role="columnheader" css={cellStyles}>
            <EuiFormLabel>{name}</EuiFormLabel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {/* The outer panel draws its border with a pseudo-element, so an inner panel scrolls. */}
      <EuiPanel
        role="rowgroup"
        tabIndex={0}
        color="transparent"
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        css={css`
          ${scrollStyles}
          /* The scroll styles hide the focus ring, which keyboard users need on this tab stop. */
          &:focus {
            ${focusRingStyles}
          }
          max-block-size: ${euiTheme.base * (isNested ? 10 : 15)}px;
          padding: ${euiTheme.size.s} ${inlinePadding} ${isNested ? 0 : euiTheme.size.m};
        `}
      >
        {rows}
      </EuiPanel>
    </EuiPanel>
  );
};
