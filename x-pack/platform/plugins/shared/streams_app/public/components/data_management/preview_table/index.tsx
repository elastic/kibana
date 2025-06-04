/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGrid, EuiDataGridRowHeightsOptions } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SampleDocument } from '@kbn/streams-schema';
import React, { useMemo } from 'react';

export function PreviewTable({
  documents,
  displayColumns,
  renderCellValue,
  rowHeightsOptions,
  toolbarVisibility = false,
  setVisibleColumns,
  columnOrderHint = [],
}: {
  documents: SampleDocument[];
  displayColumns?: string[];
  renderCellValue?: (doc: SampleDocument, columnId: string) => React.ReactNode | undefined;
  rowHeightsOptions?: EuiDataGridRowHeightsOptions;
  toolbarVisibility?: boolean;
  setVisibleColumns?: (visibleColumns: string[]) => void;
  columnOrderHint?: string[];
}) {
  const allColumns = useMemo(() => {
    const cols = new Set<string>();
    documents.forEach((doc) => {
      if (!doc || typeof doc !== 'object') {
        return;
      }
      Object.keys(doc).forEach((key) => {
        cols.add(key);
      });
    });
    let unorderedAllColumns = Array.from(cols);
    // Sort columns based on the columnOrderHint if provided
    if (columnOrderHint.length > 0) {
      const orderedCols = columnOrderHint.filter((col) => unorderedAllColumns.includes(col));
      const unorderedCols = unorderedAllColumns.filter((col) => !orderedCols.includes(col));
      unorderedAllColumns = [...orderedCols, ...unorderedCols];
    }
    // Always show the displayColumns first, but preserve the order from unorderedAllColumns
    if (displayColumns) {
      const displaySet = new Set(displayColumns);
      unorderedAllColumns = [
        ...unorderedAllColumns.filter((col) => displaySet.has(col)),
        ...unorderedAllColumns.filter((col) => !displaySet.has(col)),
      ];
    }
    return unorderedAllColumns;
  }, [columnOrderHint, displayColumns, documents]);
  const visibleColumns = useMemo(() => {
    if (displayColumns) {
      // if displayColumns is provided, order them according to the columnOrderHint
      const orderedCols = columnOrderHint.filter((col) => displayColumns.includes(col));
      const unorderedCols = displayColumns.filter((col) => !orderedCols.includes(col));
      return [...orderedCols, ...unorderedCols];
    }

    return allColumns;
  }, [allColumns, columnOrderHint, displayColumns]);

  const gridColumns = useMemo(() => {
    return allColumns.map((column) => ({
      id: column,
      displayAsText: column,
      actions: false as false,
      initialWidth: visibleColumns.length > 10 ? 250 : undefined,
    }));
  }, [allColumns, visibleColumns.length]);

  return (
    <EuiDataGrid
      aria-label={i18n.translate('xpack.streams.resultPanel.euiDataGrid.previewLabel', {
        defaultMessage: 'Preview',
      })}
      columns={gridColumns}
      columnVisibility={{
        visibleColumns,
        setVisibleColumns: setVisibleColumns || (() => {}),
        canDragAndDropColumns: false,
      }}
      toolbarVisibility={toolbarVisibility}
      rowCount={documents.length}
      rowHeightsOptions={rowHeightsOptions}
      renderCellValue={({ rowIndex, columnId }) => {
        const doc = documents[rowIndex];
        if (!doc || typeof doc !== 'object') {
          return '';
        }

        if (renderCellValue) {
          const renderedValue = renderCellValue(doc, columnId);
          if (renderedValue !== undefined) {
            return renderedValue;
          }
        }

        const value = (doc as SampleDocument)[columnId];
        if (value === undefined || value === null) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      }}
    />
  );
}
