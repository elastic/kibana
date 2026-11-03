/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable, EuiText, EuiToolTip } from '@elastic/eui';
import type { EsqlResponse, FieldValue } from '../../../common/types';
import { ValueCell } from './value_cell';
import { i18nTexts } from '../translations';

type ResultRow = Record<string, FieldValue> & { readonly rowKey: string };

// Column names can contain dots, which the table would treat as nested paths, so rows use
// positional keys instead.
function columnKey(position: number): string {
  return `c${position}`;
}

/** Client-side paginated, sortable table of ES|QL results. */
export function EsqlResultsTable({ result }: { result: EsqlResponse }) {
  const { columns, values } = result;

  const items = useMemo<ResultRow[]>(
    () =>
      values.map((row, rowPosition) => {
        const item: Record<string, FieldValue> = {};
        row.forEach((value, position) => {
          item[columnKey(position)] = value;
        });
        return { ...item, rowKey: String(rowPosition) };
      }),
    [values]
  );

  const tableColumns: Array<EuiBasicTableColumn<ResultRow>> = columns.map(
    ({ name, type }, position) => ({
      field: columnKey(position),
      name: (
        <EuiToolTip content={type}>
          <span tabIndex={0}>{name}</span>
        </EuiToolTip>
      ),
      sortable: true,
      truncateText: true,
      render: (value: FieldValue) => <ValueCell value={value} singleLine />,
    })
  );

  return (
    <div css={{ overflowX: 'auto' }}>
      <EuiInMemoryTable<ResultRow>
        tableCaption={i18nTexts.esqlResultsCaption}
        items={items}
        itemId="rowKey"
        columns={tableColumns}
        tableLayout="fixed"
        compressed
        responsiveBreakpoint={false}
        css={{ minWidth: columns.length * 140 }}
        pagination={{ initialPageSize: 50, pageSizeOptions: [25, 50, 100, 500] }}
        sorting
        noItemsMessage={<EuiText size="s">{i18nTexts.noEsqlRows}</EuiText>}
        data-test-subj="indexExplorerEsqlResults"
      />
    </div>
  );
}
