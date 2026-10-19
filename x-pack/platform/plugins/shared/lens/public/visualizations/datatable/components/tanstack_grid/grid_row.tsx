/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import React, { memo } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';
import { GridCell } from './grid_cell';
import type { GridStyles } from './styles';
import type { GridColumnModel, TanStackDatatableGridProps } from './types';

interface GridRowProps {
  models: GridColumnModel[];
  flexStyles: CSSProperties[];
  rowIndex: number;
  visibleRowIndex: number;
  ariaRowIndex: number;
  isStriped: boolean;
  styles: GridStyles;
  contentCss: GridStyles['contentSingleLine'];
  isTruncated: boolean;
  renderCellValue: TanStackDatatableGridProps['renderCellValue'];
  renderCellPopover?: TanStackDatatableGridProps['renderCellPopover'];
  /** Column index (1-based) of the grid's tab stop when it is in this row. */
  tabStopColIndex?: number;
  virtualIndex: number;
  measureElement: Virtualizer<HTMLDivElement, Element>['measureElement'];
}

export const GridRow = memo(
  ({
    models,
    flexStyles,
    rowIndex,
    visibleRowIndex,
    ariaRowIndex,
    isStriped,
    styles,
    contentCss,
    isTruncated,
    renderCellValue,
    renderCellPopover,
    tabStopColIndex,
    virtualIndex,
    measureElement,
  }: GridRowProps) => (
    <div
      ref={measureElement}
      data-index={virtualIndex}
      role="row"
      aria-rowindex={ariaRowIndex}
      css={[styles.row, isStriped && styles.rowStriped, styles.rowHover]}
    >
      {models.map((model, index) => (
        <GridCell
          key={model.id}
          model={model}
          rowIndex={rowIndex}
          visibleRowIndex={visibleRowIndex}
          renderCellValue={renderCellValue}
          renderCellPopover={renderCellPopover}
          styles={styles}
          contentCss={contentCss}
          isTruncated={isTruncated}
          flexStyle={flexStyles[index]}
          isTabStop={model.ariaColIndex === tabStopColIndex}
        />
      ))}
    </div>
  )
);
