/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled, { css } from 'styled-components';

interface RowProps {
  rowHeight?: string;
  rowPadding?: string;
}

const Row = styled.div.attrs({
  className: 'siemSkeletonRow',
})<RowProps>`
  ${({ rowHeight, rowPadding, theme }) => css`
    border-bottom: ${theme.eui.euiBorderThin};
    display: flex;
    height: ${rowHeight ? rowHeight : theme.eui.euiSizeXL};
    padding: ${rowPadding
      ? rowPadding
      : theme.eui.paddingSizes.s + ' ' + theme.eui.paddingSizes.xs};
  `}
`;
Row.displayName = 'Row';

interface CellProps {
  cellColor?: string;
  cellMargin?: string;
}

const Cell = styled.div.attrs({
  className: 'siemSkeletonRow__cell',
})<CellProps>`
  ${({ cellColor, cellMargin, theme }) => css`
    background-color: ${cellColor ? cellColor : theme.eui.euiColorLightestShade};
    border-radius: 2px;
    flex: 1;

    & + & {
      margin-left: ${cellMargin ? cellMargin : theme.eui.gutterTypes.gutterSmall};
    }
  `}
`;
Cell.displayName = 'Cell';

export interface SkeletonRowProps extends CellProps, RowProps {
  cellCount?: number;
  style?: object;
}

export const SkeletonRow = React.memo<SkeletonRowProps>(
  ({ cellColor, cellCount = 4, cellMargin, rowHeight, rowPadding, style }) => {
    const cells = [...Array(cellCount)].map((_, i) => (
      <Cell cellColor={cellColor} cellMargin={cellMargin} key={i}></Cell>
    ));

    return (
      <Row rowHeight={rowHeight} rowPadding={rowPadding} style={style}>
        {cells}
      </Row>
    );
  }
);
SkeletonRow.displayName = 'SkeletonRow';
