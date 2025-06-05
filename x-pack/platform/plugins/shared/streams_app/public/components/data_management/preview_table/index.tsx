/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGrid, EuiDataGridRowHeightsOptions, EuiDataGridSorting } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SampleDocument } from '@kbn/streams-schema';
import React, { useMemo } from 'react';
import { SimulationContext } from '../stream_detail_enrichment/state_management/simulation_state_machine';

export function PreviewTable({
  documents,
  displayColumns,
  renderCellValue,
  rowHeightsOptions,
  sorting,
  setSorting,
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
  sorting?: SimulationContext['previewColumnsSorting'];
  setSorting?: (sorting: SimulationContext['previewColumnsSorting']) => void;
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

  const sortingConfig = useMemo(() => {
    if (!sorting && !setSorting) {
      return undefined;
    }
    return {
      columns: sorting?.fieldName
        ? [
            {
              id: sorting?.fieldName || '',
              direction: sorting?.direction || 'asc',
            },
          ]
        : [],
      onSort: (newSorting) => {
        if (setSorting) {
          const mostRecentSorting = newSorting[newSorting.length - 1];
          setSorting({
            fieldName: mostRecentSorting?.id,
            direction: mostRecentSorting?.direction || 'asc',
          });
        }
      },
    } as EuiDataGridSorting;
  }, [setSorting, sorting]);

  const gridColumns = useMemo(() => {
    return allColumns.map((column) => ({
      id: column,
      displayAsText: column,
      actions: sortingConfig ? { showMoveLeft: false, showMoveRight: false } : (false as false),
      isSortable: true,
      defaultSortDirection: 'asc' as 'asc' | 'desc',
      initialWidth: visibleColumns.length > 10 ? 250 : undefined,
    }));
  }, [allColumns, sortingConfig, visibleColumns.length]);

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
      sorting={sortingConfig}
      inMemory={sortingConfig ? { level: 'sorting' } : undefined}
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
