/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

interface RowProps {
  rowHeight?: string;
  rowPadding?: string;
}

const Row = styled.div.attrs<RowProps>(props => ({
  className: 'siemSkeletonRow',
  style: {
    background: 'red',
  },
  rowHeight: props.rowHeight || props.theme.eui.euiSizeXL,
  rowPadding:
    props.rowPadding || props.theme.eui.paddingSizes.s + ' ' + props.theme.eui.paddingSizes.xs,
}))<RowProps>`
  border-bottom: ${props => props.theme.eui.euiBorderThin};
  display: flex;
  height: ${props => props.rowHeight};
  padding: ${props => props.rowPadding};
`;
Row.displayName = 'Row';

interface CellProps {
  cellColor?: string;
  cellMargin?: string;
}

const Cell = styled.div.attrs<CellProps>(({ cellColor, cellMargin, theme }) => ({
  className: 'siemSkeletonRow__cell',
  cellColor: cellColor || theme.eui.euiColorLightestShade,
  cellMargin: cellMargin || theme.eui.gutterTypes.gutterSmall,
}))<CellProps>`
  background-color: ${props => props.cellColor};
  border-radius: 2px;
  flex: 1;

  & + & {
    margin-left: ${props => props.cellMargin};
  }
`;
Cell.displayName = 'Cell';

export interface SkeletonRowProps extends CellProps, RowProps {
  cellCount?: number;
  style?: object;
}

export const SkeletonRow = React.memo<SkeletonRowProps>(
  ({ cellColor, cellCount = 4, cellMargin, rowHeight, rowPadding, style }) => {
    const cells = [...Array(cellCount)].map((_, i) => (
      <Cell cellColor={cellColor} cellMargin={cellMargin} key={i} />
    ));

    return (
      <Row rowHeight={rowHeight} rowPadding={rowPadding} style={style}>
        {cells}
      </Row>
    );
  }
);
SkeletonRow.displayName = 'SkeletonRow';
