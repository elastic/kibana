/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiDataGrid,
  EuiSpacer,
  type EuiDataGridColumn,
  type RenderCellValue,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { KbnWarningCallout } from '@kbn/ui-callout';

const PREVIEW_ROWS = 100;

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const getResultSummary = (table: Datatable, durationMs?: number): string =>
  i18n.translate('xpack.notebook.resultPreview.summary', {
    defaultMessage:
      '{rows, plural, one {# row} other {# rows}} · {columns, plural, one {# col} other {# cols}}{hasDuration, select, true { · {durationMs} ms} other {}}',
    values: {
      rows: table.rows.length,
      columns: table.columns.length,
      hasDuration: durationMs !== undefined,
      durationMs,
    },
  });

const ResultGrid = ({ table }: { table: Datatable }) => {
  const columns = useMemo<EuiDataGridColumn[]>(
    () => table.columns.map(({ id, name }) => ({ id, displayAsText: name })),
    [table]
  );
  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id));
  const rows = table.rows.slice(0, PREVIEW_ROWS);
  const renderCellValue: RenderCellValue = ({ rowIndex, columnId }) =>
    formatValue(rows[rowIndex]?.[columnId]);

  return (
    <EuiDataGrid
      aria-label={i18n.translate('xpack.notebook.resultPreview.gridLabel', {
        defaultMessage: 'Query results',
      })}
      columns={columns}
      columnVisibility={{ visibleColumns, setVisibleColumns }}
      rowCount={rows.length}
      renderCellValue={renderCellValue}
      gridStyle={{ border: 'horizontal', header: 'underline', fontSize: 's' }}
      toolbarVisibility={false}
      height={Math.min(400, 40 + rows.length * 34)}
    />
  );
};

export const ResultPreview = ({
  id,
  table,
  truncated,
  durationMs,
}: {
  id: string;
  table: Datatable;
  truncated: boolean;
  durationMs?: number;
}) => (
  <>
    {truncated && (
      <>
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.notebook.resultPreview.truncated', {
            defaultMessage:
              'Elasticsearch capped the results at {rows} rows. Narrow the query or add a LIMIT to control how many rows come back.',
            values: { rows: table.rows.length },
          })}
          data-test-subj="notebookResultTruncated"
        />
        <EuiSpacer size="s" />
      </>
    )}
    <EuiAccordion
      id={`notebookResult-${id}`}
      buttonContent={getResultSummary(table, durationMs)}
      initialIsOpen={false}
      paddingSize="s"
      data-test-subj="notebookResultPreview"
    >
      <ResultGrid table={table} />
    </EuiAccordion>
  </>
);
