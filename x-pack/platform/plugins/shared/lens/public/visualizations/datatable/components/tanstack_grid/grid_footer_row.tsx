/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import React from 'react';
import type { GridStyles } from './styles';
import type { GridColumnModel, TanStackCellValueProps, TanStackDatatableGridProps } from './types';

const noop = () => {};

interface GridFooterRowProps {
  models: GridColumnModel[];
  flexStyles: CSSProperties[];
  ariaRowIndex: number;
  /** The row of the data the footer summarizes, used as the position of its cell renderers. */
  rowIndex: number;
  styles: GridStyles;
  renderFooterCellValue: TanStackDatatableGridProps['renderFooterCellValue'];
  /** Column index (1-based) of the grid's tab stop when it is in the footer. */
  tabStopColIndex?: number;
}

/** A sticky summary row below the data. */
export const GridFooterRow = ({
  models,
  flexStyles,
  ariaRowIndex,
  rowIndex,
  styles,
  renderFooterCellValue: RenderFooterCellValue,
  tabStopColIndex,
}: GridFooterRowProps) => (
  <div role="row" aria-rowindex={ariaRowIndex} css={styles.footerRow}>
    {models.map((model, index) => {
      const colIndex = model.dataColIndex ?? model.ariaColIndex - 1;
      const { control } = model;
      const ControlFooter = control?.footerCellRender;
      const controlFooterProps: TanStackCellValueProps = {
        rowIndex,
        visibleRowIndex: rowIndex,
        colIndex,
        columnId: model.id,
        setCellProps: noop,
        isExpandable: false,
        isExpanded: false,
        isDetails: false,
      };
      return (
        <div
          key={model.id}
          role="gridcell"
          aria-colindex={model.ariaColIndex}
          tabIndex={model.ariaColIndex === tabStopColIndex ? 0 : -1}
          data-test-subj={`dataGridFooterCell-${model.id}`}
          css={styles.cell}
          style={flexStyles[index]}
          {...control?.footerCellProps}
        >
          {control && ControlFooter && <ControlFooter {...controlFooterProps} />}
          {!control && RenderFooterCellValue && (
            <RenderFooterCellValue columnId={model.id} colIndex={colIndex} />
          )}
        </div>
      );
    })}
  </div>
);
