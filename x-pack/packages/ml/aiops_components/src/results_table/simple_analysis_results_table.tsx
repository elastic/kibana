/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';

import { type SignificantItem } from '@kbn/ml-agg-utils';

import { getFieldNameColumn, getFieldValueColumn, getChangeDescriptionColumn } from './columns';

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
  const adjustedTableItems: SignificantItem[] = tableItems.map((item) => {
    return {
      key: `${item.field}:${item.value}`,
      fieldName: item.field,
      fieldValue: item.value,
      doc_count: item.documentCount,
      bg_count: item.baselineCount,
      total_doc_count: 0,
      total_bg_count: 0,
      score: 0,
      pValue: 0,
      normalizedScore: 0,
      type: item.type === 'metadata' ? 'keyword' : 'log_pattern',
      changeDescription: item.logIncrease,
    };
  });

  const columns: Array<EuiBasicTableColumn<SignificantItem>> = [
    getFieldNameColumn(),
    getFieldValueColumn(),
    getChangeDescriptionColumn(),
  ];

  return (
    <EuiInMemoryTable
      data-test-subj="aiopsLogRateAnalysisResultsTable"
      compressed
      columns={columns}
      items={adjustedTableItems.splice(0, 5)}
      loading={false}
      sorting={false}
      pagination={false}
    />
  );
};
