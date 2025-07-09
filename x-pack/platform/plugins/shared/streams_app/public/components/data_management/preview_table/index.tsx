/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiDataGrid,
  EuiDataGridControlColumn,
  EuiDataGridProps,
  EuiDataGridRowHeightsOptions,
  EuiDataGridSorting,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SampleDocument } from '@kbn/streams-schema';
import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import { SimulationContext } from '../stream_detail_enrichment/state_management/simulation_state_machine';

export function PreviewTable({
  documents,
  displayColumns,
  height,
  renderCellValue,
  rowHeightsOptions,
  sorting,
  setSorting,
  toolbarVisibility = false,
  setVisibleColumns,
  columnOrderHint = [],
  selectableRow = false,
  selectedRowIndex,
  onRowSelected,
}: {
  documents: SampleDocument[];
  displayColumns?: string[];
  height?: EuiDataGridProps['height'];
  renderCellValue?: (doc: SampleDocument, columnId: string) => React.ReactNode | undefined;
  rowHeightsOptions?: EuiDataGridRowHeightsOptions;
  toolbarVisibility?: boolean;
  setVisibleColumns?: (visibleColumns: string[]) => void;
  columnOrderHint?: string[];
  sorting?: SimulationContext['previewColumnsSorting'];
  setSorting?: (sorting: SimulationContext['previewColumnsSorting']) => void;
  selectableRow?: boolean;
  selectedRowIndex?: number;
  onRowSelected?: (selectedRowIndex: number) => void;
}) {
  const { euiTheme: theme } = useEuiTheme();
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
      actions:
        Boolean(setVisibleColumns) || Boolean(setSorting)
          ? {
              showHide: Boolean(setVisibleColumns),
              showMoveLeft: Boolean(setVisibleColumns),
              showMoveRight: Boolean(setVisibleColumns),
              showSortAsc: Boolean(setSorting),
              showSortDesc: Boolean(setSorting),
            }
          : (false as false),
      initialWidth: visibleColumns.length > 10 ? 250 : undefined,
    }));
  }, [canonicalColumnOrder, setSorting, setVisibleColumns, visibleColumns.length]);

  const leadingControlColumns: EuiDataGridControlColumn[] = useMemo(
    () =>
      selectableRow
        ? [
            {
              id: 'selection',
              width: 36,
              headerCellRender: () => null,
              rowCellRender: ({ rowIndex }) => (
                <EuiButtonIcon
                  onClick={() => {
                    if (selectableRow && onRowSelected) {
                      onRowSelected(rowIndex);
                    }
                  }}
                  aria-label={i18n.translate(
                    'xpack.streams.resultPanel.euiDataGrid.preview.selectRowAriaLabel',
                    {
                      defaultMessage: 'Select row {rowIndex}',
                      values: { rowIndex: rowIndex + 1 },
                    }
                  )}
                  iconType={selectedRowIndex === rowIndex && selectableRow ? 'minimize' : 'expand'}
                  color={selectedRowIndex === rowIndex && selectableRow ? 'primary' : 'text'}
                />
              ),
            },
          ]
        : [],
    [onRowSelected, selectableRow, selectedRowIndex]
  );

  return (
    <EuiDataGrid
      aria-label={i18n.translate('xpack.streams.resultPanel.euiDataGrid.previewLabel', {
        defaultMessage: 'Preview',
      })}
      leadingControlColumns={leadingControlColumns}
      columns={gridColumns}
      columnVisibility={{
        visibleColumns,
        setVisibleColumns: setVisibleColumns || (() => {}),
        canDragAndDropColumns: false,
      }}
      gridStyle={
        selectedRowIndex !== undefined
          ? {
              rowClasses: {
                [String(selectedRowIndex)]: css`
                  background-color: ${theme.colors.highlight};
                `,
              },
            }
          : undefined
      }
      sorting={sortingConfig}
      inMemory={sortingConfig ? { level: 'sorting' } : undefined}
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
