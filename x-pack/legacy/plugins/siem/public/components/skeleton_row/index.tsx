/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';
import styled, { css } from 'styled-components';

const Row = styled.div.attrs({
  className: 'siemSkeletonRow',
})<{ rowHeight?: string; rowPadding?: string }>`
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

const Cell = styled.div.attrs({
  className: 'siemSkeletonRow__cell',
})<{ cellColor?: string; cellMargin?: string }>`
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

export interface SkeletonRowProps {
  cellColor?: string;
  cellCount?: number;
  cellMargin?: string;
  rowHeight?: string;
  rowPadding?: string;
  style?: object;
}

export const SkeletonRow = pure<SkeletonRowProps>(
  ({ cellColor, cellCount = 4, cellMargin, rowHeight, rowPadding, style }) => {
    const colElements = [];

    for (let i = 0; i < cellCount; i++) {
      colElements.push(<Cell cellColor={cellColor} cellMargin={cellMargin} key={i}></Cell>);
    }

    return (
      <Row rowHeight={rowHeight} rowPadding={rowPadding} style={style}>
        {colElements}
      </Row>
    );
  }
);
SkeletonRow.displayName = 'SkeletonRow';
