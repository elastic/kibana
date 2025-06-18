/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGrid, EuiDataGridProps, EuiDataGridRowHeightsOptions } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SampleDocument } from '@kbn/streams-schema';
import React, { useMemo } from 'react';

export function PreviewTable({
  documents,
  displayColumns,
  height,
  renderCellValue,
  rowHeightsOptions,
  toolbarVisibility = false,
  setVisibleColumns,
  columnOrderHint = [],
}: {
  documents: SampleDocument[];
  displayColumns?: string[];
  height?: EuiDataGridProps['height'];
  renderCellValue?: (doc: SampleDocument, columnId: string) => React.ReactNode | undefined;
  rowHeightsOptions?: EuiDataGridRowHeightsOptions;
  toolbarVisibility?: boolean;
  setVisibleColumns?: (visibleColumns: string[]) => void;
  columnOrderHint?: string[];
}) {
  // Determine canonical column order
  const canonicalColumnOrder = useMemo(() => {
    const cols = new Set<string>();
    documents.forEach((doc) => {
      if (!doc || typeof doc !== 'object') {
        return;
      }
      Object.keys(doc).forEach((key) => {
        cols.add(key);
      });
    });
    let allColumns = Array.from(cols);

    // Sort columns by displayColumns or alphabetically as baseline
    allColumns = allColumns.sort((a, b) => {
      const indexA = (displayColumns || []).indexOf(a);
      const indexB = (displayColumns || []).indexOf(b);
      if (indexA === -1 && indexB === -1) {
        return a.localeCompare(b);
      }
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    // Sort columns based on the columnOrderHint if provided
    if (columnOrderHint.length > 0) {
      const orderedCols = columnOrderHint.filter((col) => allColumns.includes(col));
      const unorderedCols = allColumns.filter((col) => !orderedCols.includes(col));
      allColumns = [...orderedCols, ...unorderedCols];
    }
    // Always show the displayColumns first, but preserve the order from allColumns
    if (displayColumns) {
      const displaySet = new Set(displayColumns);
      allColumns = [
        ...allColumns.filter((col) => displaySet.has(col)),
        ...allColumns.filter((col) => !displaySet.has(col)),
      ];
    }
    return allColumns;
  }, [columnOrderHint, displayColumns, documents]);

  // Derive visibleColumns from canonical order
  const visibleColumns = useMemo(() => {
    if (displayColumns) {
      return canonicalColumnOrder.filter((col) => displayColumns.includes(col));
    }
    return canonicalColumnOrder;
  }, [canonicalColumnOrder, displayColumns]);

  // Derive gridColumns from canonical order
  const gridColumns = useMemo(() => {
    return canonicalColumnOrder.map((column) => ({
      id: column,
      displayAsText: column,
      actions: false as false,
      initialWidth: visibleColumns.length > 10 ? 250 : undefined,
    }));
  }, [canonicalColumnOrder, visibleColumns.length]);

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
      height={height}
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
