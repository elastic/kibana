/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { TabularDataResult } from '@kbn/onechat-common/tools/tool_result';
import { FormattedMessage } from '@kbn/i18n-react';

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
  const columns: Array<EuiBasicTableColumn<Record<string, unknown>>> = data.columns.map((col) => ({
    field: col.name,
    name: col.name,
    render: (value: unknown) => formatCellValue(value),
  }));

  const items: Array<Record<string, unknown>> = data.values.map((row) => {
    const item: Record<string, unknown> = {};
    data.columns.forEach((col, idx) => {
      item[col.name] = row[idx];
    });
    return item;
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.onechat.conversation.thinking.tabularResult.title"
          defaultMessage="Table result"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBasicTable columns={columns} items={items} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
