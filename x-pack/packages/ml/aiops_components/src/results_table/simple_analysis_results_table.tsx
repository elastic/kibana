/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable, EuiText, EuiCode } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { NARROW_COLUMN_WIDTH } from './constants';

interface TableItem {
  field: string;
  value: string | number;
  type: 'metadata' | 'log message pattern';
  documentCount: number;
  baselineCount: number;
  logIncrease: string;
}

interface SimpleAnalysisResultsTableProps {
  tableItems: TableItem[];
}

export const SimpleAnalysisResultsTable: FC<SimpleAnalysisResultsTableProps> = ({ tableItems }) => {
  const columns: Array<EuiBasicTableColumn<TableItem>> = [
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldName',
      width: NARROW_COLUMN_WIDTH,
      field: 'field',
      name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldNameLabel', {
        defaultMessage: 'Field name',
      }),
      render: (_, { field }) => {
        return (
          <span title={field} className="eui-textTruncate">
            {field}
          </span>
        );
      },
      sortable: true,
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldValue',
      field: 'value',
      name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldValueLabel', {
        defaultMessage: 'Field value',
      }),
      render: (_, { value, type }) => (
        <span title={String(value)}>
          {type === 'metadata' ? (
            String(value)
          ) : (
            <EuiText size="xs">
              <EuiCode language="log" transparentBackground css={{ paddingInline: '0px' }}>
                {String(value)}
              </EuiCode>
            </EuiText>
          )}
        </span>
      ),
      sortable: true,
      textOnly: true,
      truncateText: { lines: 3 },
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnDocCount',
      width: NARROW_COLUMN_WIDTH,
      field: 'logIncrease',
      name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.docCountLabel', {
        defaultMessage: 'Increase',
      }),
      sortable: true,
      valign: 'middle',
    },
  ];

  return (
    <EuiInMemoryTable
      data-test-subj="aiopsLogRateAnalysisResultsTable"
      compressed
      columns={columns}
      items={tableItems.splice(0, 5)}
      loading={false}
      sorting={false}
      pagination={false}
    />
  );
};
