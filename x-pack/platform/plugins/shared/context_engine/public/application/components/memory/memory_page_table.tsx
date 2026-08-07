/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface MemoryPageRow {
  id: string;
  name: string;
  title: string;
  categories: string[];
}

interface MemoryPageTableProps {
  rows: MemoryPageRow[];
  isLoading: boolean;
  onSelect: (row: MemoryPageRow) => void;
  emptyMessage: string;
}

export const MemoryPageTable = ({
  rows,
  isLoading,
  onSelect,
  emptyMessage,
}: MemoryPageTableProps) => {
  const columns: Array<EuiBasicTableColumn<MemoryPageRow>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.contextEngine.memory.table.titleColumn', {
        defaultMessage: 'Page',
      }),
      render: (title: string, row: MemoryPageRow) => (
        <EuiLink onClick={() => onSelect(row)} data-test-subj={`contextMemoryPageLink-${row.name}`}>
          {title || row.name}
        </EuiLink>
      ),
    },
    {
      field: 'categories',
      name: i18n.translate('xpack.contextEngine.memory.table.categoriesColumn', {
        defaultMessage: 'Categories',
      }),
      render: (categories: string[]) =>
        categories.length === 0 ? (
          <>—</>
        ) : (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {categories.map((category) => (
              <EuiFlexItem grow={false} key={category}>
                <EuiBadge color="hollow">{category}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
    },
  ];

  if (!isLoading && rows.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="contextMemoryEmpty"
        iconType="documents"
        titleSize="xs"
        title={<h4>{emptyMessage}</h4>}
      />
    );
  }

  return (
    <EuiBasicTable
      tableCaption={i18n.translate('xpack.contextEngine.memory.table.caption', {
        defaultMessage: 'Memory pages',
      })}
      data-test-subj="contextMemoryPageTable"
      items={rows}
      columns={columns}
      loading={isLoading}
      tableLayout="auto"
    />
  );
};
