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
  const colIndex = table.columns.findIndex((col) => col.id === columnId);
  const filterable = colIndex >= 0 ? columnFilterable?.[colIndex] || false : false;

  if (isEmptyValue(rawValue)) {
    return <DefaultCellPopover {...popoverProps} cellActions={null} />;
  }

  const popoverMessage = !filterable
    ? isEsqlTableComputedColumn(table, columnId)
      ? getEsqlComputedColumnFilterDisabledMessage
      : getGenericFilterDisabledMessage
    : undefined;

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
