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
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBadge,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
  rawResults: { cols: EuiDataGridColumn[]; rows: Array<Record<string, string | null | undefined>> };
  alerts: string[] | null;
}

export const TestQueryRowTable: React.FC<TestQueryRowTableProps> = ({ rawResults, alerts }) => {
  return (
    <EuiPanel style={{ overflow: 'hidden' }} hasShadow={false} hasBorder={true}>
      <EuiDataGrid
        css={styles.grid}
        aria-label={i18n.translate('xpack.stackAlerts.esQuery.ui.testQueryTableAriaLabel', {
          defaultMessage: 'Test query grid',
        })}
        data-test-subj="test-query-row-datagrid"
        columns={rawResults.cols}
        columnVisibility={{
          visibleColumns: rawResults.cols.map((c) => c.id),
          setVisibleColumns: () => {},
        }}
        rowCount={rawResults.rows.length}
        gridStyle={{
          border: 'horizontal',
          rowHover: 'none',
        }}
        renderCellValue={({ rowIndex, columnId }) => rawResults.rows[rowIndex][columnId] ?? '—'}
        pagination={{
          pageIndex: 0,
          pageSize: 10,
          onChangeItemsPerPage: () => {},
          onChangePage: () => {},
        }}
        toolbarVisibility={false}
      />
      <EuiSpacer size="m" />
      {alerts && (
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText>
              <h5>
                {i18n.translate('xpack.stackAlerts.esQuery.ui.testQueryAlerts', {
                  defaultMessage: 'Alerts generated',
                })}
              </h5>
            </EuiText>
          </EuiFlexItem>
          {alerts.map((alert, index) => {
            return (
              <EuiFlexItem key={index} grow={false}>
                <EuiBadge data-test-subj="alert-badge" color="primary">
                  {alert}
                </EuiBadge>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
