/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBasicTable, EuiCode } from '@elastic/eui';
import type { TabularDataResult } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';

interface TabularDataResultStepProps {
  result: TabularDataResult;
}

const formatCellValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'object') {
    try {
      return <EuiCode>{JSON.stringify(value)}</EuiCode>;
    } catch (e) {
      return String(value);
    }
  }
  return String(value);
};

export const TabularDataResultStep: React.FC<TabularDataResultStepProps> = ({
  result: { data },
}) => {
  return (
    <EuiBasicTable
      columns={data.result.columns.map((column) => {
        return {
          field: column.name,
          name: column.name,
          render: (value: unknown) => formatCellValue(value),
        };
      })}
      items={data.result.values.map((row) => {
        return Object.fromEntries(data.result.columns.map((col, idx) => [col.name, row[idx]]));
      })}
    />
  );
};
