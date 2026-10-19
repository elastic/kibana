/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiDataGridCellPopoverElementProps, UseEuiTheme } from '@elastic/eui';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { isEmptyValue } from './cell_value_helpers';
import type { TanStackCellPopoverProps } from './tanstack_grid';
import { TanStackDefaultCellPopover } from './tanstack_grid';
import {
  getEsqlComputedColumnFilterDisabledMessage,
  getGenericFilterDisabledMessage,
  isEsqlTableComputedColumn,
} from './helpers';

const datatableCellPopoverStyles = {
  message: ({ euiTheme }: UseEuiTheme) =>
    css`
      padding: ${euiTheme.size.s};
      color: ${euiTheme.colors.textSubdued};
      border-block-start: ${euiTheme.border.thin};
      margin-block: ${euiTheme.size.s} -${euiTheme.size.s};
      margin-inline: -${euiTheme.size.s};
    `,
};

const getPopoverMessage = (table: Datatable, columnId: string, columnFilterable?: boolean[]) => {
  const colIndex = table.columns.findIndex((col) => col.id === columnId);
  const filterable = colIndex >= 0 ? columnFilterable?.[colIndex] || false : false;
  if (filterable) {
    return undefined;
  }
  return isEsqlTableComputedColumn(table, columnId)
    ? getEsqlComputedColumnFilterDisabledMessage
    : getGenericFilterDisabledMessage;
};

const LensDatatableCellPopover = ({
  table,
  columnFilterable,
  popoverProps,
}: {
  table: Datatable;
  columnFilterable?: boolean[];
  popoverProps: EuiDataGridCellPopoverElementProps;
}) => {
  const styles = useMemoCss(datatableCellPopoverStyles);
  const { rowIndex, columnId, DefaultCellPopover, cellActions } = popoverProps;

  const rawValue = table.rows[rowIndex]?.[columnId];

  if (isEmptyValue(rawValue)) {
    return <DefaultCellPopover {...popoverProps} cellActions={null} />;
  }

  const popoverMessage = getPopoverMessage(table, columnId, columnFilterable);

  return (
    <DefaultCellPopover
      {...popoverProps}
      cellActions={
        <>
          {cellActions}
          {popoverMessage ? (
            <div css={styles.message} data-test-subj="lensDatatableCellPopoverMessage">
              {popoverMessage}
            </div>
          ) : null}
        </>
      }
    />
  );
};

export const createRenderDatatableCellPopover = (
  sortedTable: Datatable,
  columnFilterable?: boolean[]
): ((popoverProps: EuiDataGridCellPopoverElementProps) => React.ReactNode) => {
  return (popoverProps: EuiDataGridCellPopoverElementProps) => (
    <LensDatatableCellPopover
      table={sortedTable}
      columnFilterable={columnFilterable}
      popoverProps={popoverProps}
    />
  );
};

const LensTanStackCellPopover = ({
  table,
  columnFilterable,
  popoverProps,
}: {
  table: Datatable;
  columnFilterable?: boolean[];
  popoverProps: TanStackCellPopoverProps;
}) => {
  const styles = useMemoCss(datatableCellPopoverStyles);
  const { rowIndex, columnId, cellActions } = popoverProps;
  const rawValue = table.rows[rowIndex]?.[columnId];

  if (isEmptyValue(rawValue)) {
    return <TanStackDefaultCellPopover {...popoverProps} cellActions={null} />;
  }

  const popoverMessage = getPopoverMessage(table, columnId, columnFilterable);

  return (
    <TanStackDefaultCellPopover
      {...popoverProps}
      cellActions={
        <>
          {cellActions}
          {popoverMessage ? (
            <div css={styles.message} data-test-subj="lensDatatableCellPopoverMessage">
              {popoverMessage}
            </div>
          ) : null}
        </>
      }
    />
  );
};

/** The cell popover renderer for the TanStack grid, equivalent to the one for EuiDataGrid. */
export const createRenderTanStackDatatableCellPopover = (
  sortedTable: Datatable,
  columnFilterable?: boolean[]
): ((popoverProps: TanStackCellPopoverProps) => React.ReactNode) => {
  return (popoverProps: TanStackCellPopoverProps) => (
    <LensTanStackCellPopover
      table={sortedTable}
      columnFilterable={columnFilterable}
      popoverProps={popoverProps}
    />
  );
};
