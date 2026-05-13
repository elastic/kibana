/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiDataGridCellPopoverElementProps, UseEuiTheme } from '@elastic/eui';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { getQueryTimeComputedColumnFilterMessage, isEsqlQueryTimeComputedColumn } from './helpers';

const datatableCellPopoverStyles = {
  notice: ({ euiTheme }: UseEuiTheme) =>
    css`
      padding: ${euiTheme.size.s};
      color: ${euiTheme.colors.textSubdued};
      border-block-start: ${euiTheme.border.thin};
      margin-block: ${euiTheme.size.s} -${euiTheme.size.s};
      margin-inline: -${euiTheme.size.s};
    `,
};

export const DatatableCellPopover = ({
  table,
  panelHasConfiguredDrilldowns = false,
  ...props
}: EuiDataGridCellPopoverElementProps & {
  table: Datatable;
  /** When true, copy matches the column context menu (drilldowns may still apply). */
  panelHasConfiguredDrilldowns?: boolean;
}) => {
  const { DefaultCellPopover, cellActions, columnId } = props;
  const styles = useMemoCss(datatableCellPopoverStyles);

  const showQueryTimeFilterNotice = isEsqlQueryTimeComputedColumn(table, columnId);
  const queryTimeFilterNotice = showQueryTimeFilterNotice
    ? getQueryTimeComputedColumnFilterMessage(panelHasConfiguredDrilldowns)
    : undefined;

  if (!queryTimeFilterNotice) {
    return <DefaultCellPopover {...props} />;
  }

  return (
    <DefaultCellPopover
      {...props}
      cellActions={
        <>
          {cellActions}
          <div css={styles.notice} data-test-subj="lensDatatableCellExpansionQueryTimeFilterNotice">
            {queryTimeFilterNotice}
          </div>
        </>
      }
    />
  );
};
