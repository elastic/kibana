/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiDataGrid,
  EuiPanel,
  EuiDataGridColumn,
  EuiText,
  EuiBadge,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_ID_COLUMN } from '../../../../common';

const styles = {
  grid: css`
    .euiDataGridHeaderCell {
      background: none;
    }
    .euiDataGridHeader .euiDataGridHeaderCell {
      border-top: none;
    }
  `,
};

export interface TestQueryRowTableProps {
  preview: { cols: EuiDataGridColumn[]; rows: Array<Record<string, string | null | undefined>> };
}

export const TestQueryRowTable: React.FC<TestQueryRowTableProps> = ({ preview }) => {
  return (
    <EuiPanel style={{ overflow: 'hidden' }} hasShadow={false} hasBorder={true}>
      <EuiDataGrid
        css={styles.grid}
        aria-label={i18n.translate('xpack.stackAlerts.esQuery.ui.testQueryTableAriaLabel', {
          defaultMessage: 'Test query grid',
        })}
        data-test-subj="test-query-row-datagrid"
        columns={preview.cols}
        columnVisibility={{
          visibleColumns: preview.cols.map((c) => c.id),
          setVisibleColumns: () => {},
        }}
        rowCount={preview.rows.length}
        gridStyle={{
          border: 'horizontal',
          rowHover: 'none',
        }}
        renderCellValue={({ rowIndex, columnId }) => {
          const value: string | null | undefined = preview.rows[rowIndex][columnId];
          if (columnId === ALERT_ID_COLUMN && value) {
            return (
              <EuiBadge data-test-subj="alert-badge" color="primary">
                {value}
              </EuiBadge>
            );
          }
          return value ?? '-';
        }}
        pagination={{
          pageIndex: 0,
          pageSize: 10,
          onChangeItemsPerPage: () => {},
          onChangePage: () => {},
        }}
        toolbarVisibility={false}
      />
      <EuiSpacer size="m" />
      <EuiText color="subdued" size="xs">
        <p>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.testQueryTableNote', {
            defaultMessage:
              'This table is a preview and shows data from only the top 5 rows returned by the query.',
          })}
        </p>
      </EuiText>
    </EuiPanel>
  );
};
