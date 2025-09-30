/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  EuiDataGridColumnCellAction,
  EuiDataGridControlColumn,
  EuiDataGridProps,
  EuiDataGridRowHeightsOptions,
  EuiDataGridSorting,
} from '@elastic/eui';
import {
  EuiAvatar,
  EuiButtonIcon,
  EuiDataGrid,
  EuiFlexGroup,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SampleDocument } from '@kbn/streams-schema';
import React, { useMemo, useState, useCallback, createContext, useContext } from 'react';
import type {
  IgnoredField,
  DocumentWithIgnoredFields,
} from '@kbn/streams-schema/src/shared/record_types';
import { recalcColumnWidths } from '../stream_detail_enrichment/utils';
import type {
  SampleDocumentWithUIAttributes,
  SimulationContext,
} from '../stream_detail_enrichment/state_management/simulation_state_machine';
import { DATA_SOURCES_I18N } from '../stream_detail_enrichment/data_sources_flyout/translations';
import { useDataSourceSelectorById } from '../stream_detail_enrichment/state_management/data_source_state_machine';
import type { EnrichmentDataSourceWithUIAttributes } from '../stream_detail_enrichment/types';

const emptyCell = <>&nbsp;</>;

interface RowSelectionContextType {
  selectedRowIndex?: number;
  onRowSelected?: (rowIndex: number) => void;
}

export const RowSelectionContext = createContext<RowSelectionContextType>({});

const useRowSelection = () => useContext(RowSelectionContext);

function RowSelectionButton({ rowIndex }: { rowIndex: number }) {
  const { selectedRowIndex, onRowSelected } = useRowSelection();

  return (
    <EuiButtonIcon
      onClick={() => {
        if (onRowSelected) {
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
      iconType={selectedRowIndex === rowIndex ? 'minimize' : 'expand'}
      color={selectedRowIndex === rowIndex ? 'primary' : 'text'}
    />
  );
}

export const MemoPreviewTable = React.memo(PreviewTable);

function isDocumentWithIgnoredFields(
  doc: SampleDocument | DocumentWithIgnoredFields
): doc is DocumentWithIgnoredFields {
  return 'ignored_fields' in doc && Array.isArray(doc.ignored_fields);
}

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
  showRowSourceAvatars = false,
  showLeadingControlColumns = true,
  originalSamples,
  cellActions,
}: {
  documents: SampleDocument[] | DocumentWithIgnoredFields[];
  displayColumns?: string[];
  height?: EuiDataGridProps['height'];
  renderCellValue?: (
    doc: SampleDocument,
    columnId: string,
    ignoredFields?: IgnoredField[]
  ) => React.ReactNode | undefined;
  rowHeightsOptions?: EuiDataGridRowHeightsOptions;
  toolbarVisibility?: boolean;
  setVisibleColumns?: (visibleColumns: string[]) => void;
  columnOrderHint?: string[];
  sorting?: SimulationContext['previewColumnsSorting'];
  setSorting?: (sorting: SimulationContext['previewColumnsSorting']) => void;
  showRowSourceAvatars?: boolean;
  showLeadingControlColumns?: boolean;
  originalSamples?: SampleDocumentWithUIAttributes[];
  cellActions?: EuiDataGridColumnCellAction[];
}) {
  const { euiTheme: theme } = useEuiTheme();
  // Determine canonical column order
  const canonicalColumnOrder = useMemo(() => {
    const cols = new Set<string>();
    documents.forEach((doc) => {
      const document = isDocumentWithIgnoredFields(doc) ? doc.values : doc;

      if (!document || typeof document !== 'object') {
        return;
      }
      Object.keys(document).forEach((key) => {
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

  const [columnWidths, setColumnWidths] = useState<Record<string, number | undefined>>({});

  const leadingControlColumns: EuiDataGridControlColumn[] = useMemo(
    () => [
      {
        id: 'selection',
        width: showRowSourceAvatars ? 72 : 36,
        headerCellRender: () => null,
        rowCellRender: ({ rowIndex, setCellProps }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const { selectedRowIndex } = useRowSelection();

          if (selectedRowIndex === rowIndex) {
            setCellProps({
              style: {
                backgroundColor: theme.colors.highlight,
              },
            });
          } else {
            setCellProps({
              style: {},
            });
          }
          const originalSample = originalSamples?.[rowIndex];
          return (
            <EuiFlexGroup gutterSize="s">
              <RowSelectionButton rowIndex={rowIndex} />
              {showRowSourceAvatars && originalSample && (
                <RowSourceAvatar originalSample={originalSample} />
              )}
            </EuiFlexGroup>
          );
        },
      },
    ],
    [showRowSourceAvatars, originalSamples, theme.colors.highlight]
  );

  // Derive visibleColumns from canonical order
  const visibleColumns = useMemo(() => {
    if (displayColumns) {
      return canonicalColumnOrder.filter((col) => displayColumns.includes(col));
    }
    return canonicalColumnOrder;
  }, [canonicalColumnOrder, displayColumns]);

  const onColumnResize = useCallback(
    ({ columnId, width }: { columnId: string; width: number | undefined }) => {
      setColumnWidths((prev) => {
        const updated = recalcColumnWidths({
          columnId,
          width,
          prevWidths: prev,
          visibleColumns,
        });
        return updated;
      });
    },
    [visibleColumns]
  );

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
      initialWidth: columnWidths[column],
      cellActions,
    }));
  }, [canonicalColumnOrder, setVisibleColumns, setSorting, columnWidths, cellActions]);

  return (
    <EuiDataGrid
      aria-label={i18n.translate('xpack.streams.resultPanel.euiDataGrid.previewLabel', {
        defaultMessage: 'Preview',
      })}
      leadingControlColumns={
        showLeadingControlColumns && visibleColumns.length > 0 ? leadingControlColumns : undefined
      }
      columns={gridColumns}
      columnVisibility={{
        visibleColumns,
        setVisibleColumns: setVisibleColumns || (() => {}),
        canDragAndDropColumns: false,
      }}
      sorting={sortingConfig}
      inMemory={sortingConfig ? { level: 'sorting' } : undefined}
      height={height}
      toolbarVisibility={toolbarVisibility}
      rowCount={documents.length}
      rowHeightsOptions={rowHeightsOptions}
      onColumnResize={onColumnResize}
      renderCellValue={({ rowIndex, columnId, setCellProps }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { selectedRowIndex } = useRowSelection();

        if (selectedRowIndex === rowIndex) {
          setCellProps({
            style: {
              backgroundColor: theme.colors.highlight,
            },
          });
        } else {
          setCellProps({
            style: {},
          });
        }

        const doc = documents[rowIndex];
        const document = isDocumentWithIgnoredFields(doc) ? doc.values : doc;
        const ignoredFields = isDocumentWithIgnoredFields(doc) ? doc.ignored_fields : [];

        if (!document || typeof document !== 'object') {
          return emptyCell;
        }

        if (renderCellValue) {
          const renderedValue = renderCellValue(document, columnId, ignoredFields);
          if (renderedValue !== undefined) {
            return renderedValue;
          }
        }

        const value = document[columnId];
        if (value === undefined || value === null) {
          return emptyCell;
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value) || emptyCell;
      }}
    />
  );
}

function dataSourceTypeToI18nKey(type: EnrichmentDataSourceWithUIAttributes['type']) {
  switch (type) {
    case 'random-samples':
      return 'randomSamples';
    case 'kql-samples':
      return 'kqlDataSource';
    case 'custom-samples':
      return 'customSamples';
  }
}

function RowSourceAvatar({ originalSample }: { originalSample: SampleDocumentWithUIAttributes }) {
  const dataSourceContext = useDataSourceSelectorById(
    originalSample.dataSourceId,
    (snapshot) => snapshot?.context
  );
  if (!dataSourceContext) {
    // If the data source context is not available, we cannot render the avatar
    return null;
  }
  const {
    uiAttributes: { color },
    dataSource: { type: dataSourceType, name: rawDataSourceName },
  } = dataSourceContext;
  const name =
    rawDataSourceName || DATA_SOURCES_I18N[dataSourceTypeToI18nKey(dataSourceType)].placeholderName;
  return (
    <EuiToolTip content={name}>
      <EuiAvatar size="s" color={color} initialsLength={1} name={name} />
    </EuiToolTip>
  );
}
