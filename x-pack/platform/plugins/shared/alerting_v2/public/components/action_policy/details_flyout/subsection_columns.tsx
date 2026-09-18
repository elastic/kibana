/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Children, type ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiText,
  EuiTextTruncate,
  useEuiMemoizedStyles,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';

const MIN_CELL_WIDTH = 140;
const MAX_GRID_COLUMNS = 4;
const CONTAINER_NAME = 'subsectionColumns';

type GridColumns = 1 | 2 | 3 | 4;

/**
 * Grid and divider rules for a `columns`-wide state. The `:nth-child(n)` resets tie on specificity
 * with the rules that follow, so those win on source order.
 */
const columnState = (columns: number): string => `
  grid-template-columns: repeat(${columns}, minmax(0, 1fr));

  & > :nth-child(n)::before {
    display: block;
  }
  & > :nth-child(${columns}n)::before {
    display: none;
  }

  & > :nth-child(n)::after {
    display: none;
  }
  & > :nth-child(${columns}n + 1)::after {
    display: block;
  }
  & > :nth-child(1)::after {
    display: none;
  }
`;

/** Widest state first; container queries tie on specificity, so the narrowest must come last. */
const responsiveGrid = (maxColumns: number) => {
  let steps = '';
  for (let columns = maxColumns - 1; columns >= 1; columns--) {
    steps += `
      @container ${CONTAINER_NAME} (width < ${(columns + 1) * MIN_CELL_WIDTH}px) {
        ${columnState(columns)}
      }
    `;
  }
  return css`
    ${columnState(maxColumns)}
    ${steps}
  `;
};

const resolveMaxColumns = (itemCount: number): GridColumns => {
  if (itemCount <= 1) return 1;
  if (itemCount === 2) return 2;
  if (itemCount === 3) return 3;
  return MAX_GRID_COLUMNS;
};

const getStyles = ({ euiTheme }: UseEuiTheme) => {
  const color = euiTheme.border.color;
  const thickness = euiTheme.border.width.thin;
  // Keeps dividers clear of the subsection panel's rounded corners.
  const cornerGap = euiTheme.size.base;
  const rowLineWidth = `calc(100cqw - ${cornerGap} * 2)`;

  return {
    wrapper: css`
      container-type: inline-size;
      container-name: ${CONTAINER_NAME};
      /* Cancel EuiPanel padding so column dividers span the bordered box like InfoBlocks. */
      margin: calc(-1 * ${euiTheme.size.m});
    `,
    grid: css`
      display: grid;

      & > * {
        position: relative;
        min-width: 0;
        padding: ${euiTheme.size.m};
      }

      /* ::before is the column divider on each cell's inline-end edge. */
      & > *::before {
        content: '';
        position: absolute;
        inset-inline-end: 0;
        inset-block: ${cornerGap};
        inline-size: ${thickness};
        background-color: ${color};
        display: block;
      }

      /* ::after is the row separator, drawn on the block-start edge by each row's first cell. */
      & > *::after {
        content: '';
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: ${cornerGap};
        inline-size: ${rowLineWidth};
        block-size: ${thickness};
        background-color: ${color};
        display: none;
      }
    `,
    grids: {
      1: responsiveGrid(1),
      2: responsiveGrid(2),
      3: responsiveGrid(3),
      4: responsiveGrid(MAX_GRID_COLUMNS),
    },
    column: css`
      min-width: 0;
    `,
    value: css`
      a {
        font-weight: inherit;
      }
    `,
  };
};

interface ColumnProps {
  title: string;
  children: ReactNode;
  'data-test-subj'?: string;
}

/** A single title/value pair; one grid cell of `SubsectionColumns`. */
export const Column = ({
  title,
  children,
  'data-test-subj': dataTestSubj,
}: ColumnProps): React.JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const styles = useEuiMemoizedStyles(getStyles);
  const isTextValue = typeof children === 'string' || typeof children === 'number';

  return (
    <div data-test-subj={dataTestSubj} css={styles.column}>
      <EuiText size="xs" color="subdued">
        <EuiTextTruncate text={title} />
      </EuiText>
      <EuiText size="s" css={styles.value} style={{ fontWeight: euiTheme.font.weight.bold }}>
        {isTextValue ? <EuiTextTruncate text={String(children)} truncation="middle" /> : children}
      </EuiText>
    </div>
  );
};

interface SubsectionColumnsProps {
  children: ReactNode;
}

/** Responsive column grid with InfoBlocks-style dividers, for use inside a bordered Subsection. */
export const SubsectionColumns = ({ children }: SubsectionColumnsProps): React.JSX.Element => {
  const styles = useEuiMemoizedStyles(getStyles);
  const itemCount = Children.toArray(children).length;
  const columns = resolveMaxColumns(itemCount);

  return (
    <div css={styles.wrapper}>
      <div css={[styles.grid, styles.grids[columns]]}>{children}</div>
    </div>
  );
};
