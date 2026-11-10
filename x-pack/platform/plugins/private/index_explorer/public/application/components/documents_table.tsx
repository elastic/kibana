/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiButtonIcon, EuiScreenReaderOnly, EuiToolTip } from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { DocumentRow, EsqlColumn, FieldValue, Sort } from '../../../common/types';
import { MAX_RESULT_WINDOW } from '../../../common/constants';
import { documentPath } from '../lib/paths';
import { useServices } from '../services';
import { ValueCell } from './value_cell';
import { i18nTexts } from '../translations';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250];
const UNSORTABLE_TYPES = new Set(['_source', 'unsupported']);
const MIN_COLUMN_WIDTH = 140;
const COLUMN_WIDTHS: Partial<Record<string, string>> = {
  date: '200px',
  date_nanos: '230px',
  boolean: '90px',
  integer: '110px',
  long: '120px',
  double: '120px',
};

/** Flattened document keyed by column name; `_id` and `_index` cannot occur in `_source`. */
interface TableRow {
  readonly [column: string]: FieldValue | undefined;
  readonly _id: string;
  readonly _index: string;
}

interface DocumentsTableProps {
  readonly index: string;
  readonly columns: readonly EsqlColumn[];
  readonly rows: readonly DocumentRow[];
  readonly total: number;
  readonly page: number;
  readonly size: number;
  readonly sort?: Sort;
  readonly loading: boolean;
  readonly onChange: (change: { page: number; size: number; sort?: Sort }) => void;
}

/** Paginated, sortable table of documents; the `_id` column links to the document page. */
export function DocumentsTable({
  index,
  columns,
  rows,
  total,
  page,
  size,
  sort,
  loading,
  onChange,
}: DocumentsTableProps) {
  const { history } = useServices();
  const items = useMemo<TableRow[]>(
    () => rows.map(({ _id, _index, values }) => ({ ...values, _id, _index })),
    [rows]
  );
  const tableColumns: Array<EuiBasicTableColumn<TableRow>> = [
    {
      name: (
        <EuiScreenReaderOnly>
          <span>{i18nTexts.viewDocument}</span>
        </EuiScreenReaderOnly>
      ),
      width: '40px',
      render: (row: TableRow) => (
        <EuiToolTip content={i18nTexts.viewDocument} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="maximize"
            size="xs"
            color="text"
            aria-label={i18nTexts.viewDocument}
            {...reactRouterNavigate(history, documentPath(row._index, row._id))}
            data-test-subj="indexExplorerDocumentLink"
          />
        </EuiToolTip>
      ),
    },
    ...columns.map(
      ({ name, type }): EuiBasicTableColumn<TableRow> => ({
        field: name,
        name: (
          <span css={{ whiteSpace: 'nowrap' }} title={name}>
            {name}
          </span>
        ),
        width: COLUMN_WIDTHS[type],
        truncateText: true,
        sortable: !UNSORTABLE_TYPES.has(type),
        render: (_value: FieldValue | undefined, row: TableRow) => (
          <ValueCell value={row[name]} singleLine />
        ),
      })
    ),
  ];

  function handleChange({ page: nextPage, sort: nextSort }: Criteria<TableRow>) {
    const nextSize = nextPage?.size ?? size;
    onChange({
      page: nextSize === size ? nextPage?.index ?? page : 0,
      size: nextSize,
      sort: nextSort ? { field: String(nextSort.field), direction: nextSort.direction } : sort,
    });
  }

  return (
    <div css={{ overflowX: 'auto' }}>
      <EuiBasicTable<TableRow>
        tableCaption={i18nTexts.documentsTableCaption(index)}
        items={items}
        itemId={(row) => `${row._index}/${row._id}`}
        columns={tableColumns}
        loading={loading}
        tableLayout="fixed"
        compressed
        responsiveBreakpoint={false}
        css={{ minWidth: columns.length * MIN_COLUMN_WIDTH }}
        noItemsMessage={i18nTexts.noDocuments}
        pagination={{
          pageIndex: page,
          pageSize: size,
          totalItemCount: Math.min(total, MAX_RESULT_WINDOW),
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
        sorting={sort ? { sort: { field: sort.field, direction: sort.direction } } : {}}
        onChange={handleChange}
        data-test-subj="indexExplorerDocumentsTable"
      />
    </div>
  );
}
