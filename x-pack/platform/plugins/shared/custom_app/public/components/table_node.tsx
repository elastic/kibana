/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiInMemoryTable, EuiLink, EuiPanel, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { useDataLayer } from '../data/data_layer_context';
import { useSource } from '../data/use_source';
import { useActionRunner } from '../workflows/use_action_runner';
import { DataState } from './data_state';
import { formatValue, toSortValue, type CellFormat } from './format_value';
import { MissingColumn } from './missing_column';

type Row = Readonly<Record<string, unknown>>;
interface Item {
  index: number;
  values: Row;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface ColumnConfig {
  field: string;
  label?: string;
}

const NUMBER_TYPES = new Set([
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'unsigned_long',
]);
const DATE_TYPES = new Set(['date', 'date_nanos']);

/** How a column is shown follows from what the query says it holds, so authors need not say. */
const formatOf = (type: string | undefined): CellFormat =>
  type !== undefined && NUMBER_TYPES.has(type)
    ? 'number'
    : type !== undefined && DATE_TYPES.has(type)
    ? 'date'
    : 'text';

const toItems = ({ columns, rows }: SourceData): Item[] =>
  rows.map((row, index) => ({
    index,
    values: Object.fromEntries(columns.map(({ name }, position) => [name, row[position]])),
  }));

const TableContent = ({ node, data }: { node: AppNodeOfType<'table'>; data: SourceData }) => {
  const runActions = useActionRunner(node.id);
  const [dropped, setDropped] = useState<string[]>([]);

  const columns: ColumnConfig[] = node.columns ?? data.columns.map(({ name }) => ({ field: name }));
  const known = new Set(data.columns.map(({ name }) => name));
  const typeOf = (field: string) => data.columns.find(({ name }) => name === field)?.type;
  const missing = columns.map(({ field }) => field).filter((field) => !known.has(field));
  if (missing.length > 0) return <MissingColumn columns={missing} />;

  const isClickable = node.onRowClick.length > 0;
  const handleRowClick = (row: Row) => setDropped(runActions(node.onRowClick, { row }));

  const tableColumns: Array<EuiBasicTableColumn<Item>> = columns.map(
    ({ field, label }, position) => {
      const format = formatOf(typeOf(field));
      return {
        field,
        name: label ?? field,
        sortable: (item: Item) => toSortValue(item.values[field], format),
        render: (_value: unknown, item: Item) => {
          const text = formatValue(item.values[field], format);
          // A real control in the first cell, so the row action is reachable by keyboard; the row
          // click covers the pointer.
          return isClickable && position === 0 ? (
            <EuiLink
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                handleRowClick(item.values);
              }}
            >
              {text}
            </EuiLink>
          ) : (
            text
          );
        },
      };
    }
  );

  return (
    <>
      {dropped.length > 0 && (
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.customApp.tableNode.droppedTitle', {
            defaultMessage: 'Part of that selection could not be applied',
          })}
          onDismiss={() => setDropped([])}
        >
          <ul>
            {dropped.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </KbnWarningCallout>
      )}
      <EuiInMemoryTable<Item>
        compressed
        items={toItems(data)}
        itemId="index"
        columns={tableColumns}
        sorting
        pagination={{ initialPageSize: PAGE_SIZE_OPTIONS[0], pageSizeOptions: PAGE_SIZE_OPTIONS }}
        tableCaption={
          node.caption ??
          i18n.translate('xpack.customApp.tableNode.defaultCaption', {
            defaultMessage: 'Query results',
          })
        }
        rowProps={
          isClickable
            ? (item) => ({
                onClick: () => handleRowClick(item.values),
                'data-test-subj': 'customAppTableRow',
              })
            : undefined
        }
      />
    </>
  );
};

export const TableNode = ({ node }: { node: AppNodeOfType<'table'> }) => {
  const layer = useDataLayer();
  const state = useSource(node.id);

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s" data-node-id={node.id}>
      <DataState state={state} onRetry={layer.retry}>
        {(data) => <TableContent node={node} data={data} />}
      </DataState>
    </EuiPanel>
  );
};
