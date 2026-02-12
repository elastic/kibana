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
  EuiDataGridToolbarProps,
} from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  euiScreenReaderOnly,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SampleDocument } from '@kbn/streams-schema';
import ColumnHeaderTruncateContainer from '@kbn/unified-data-table/src/components/column_header_truncate_container';
import { FieldIcon } from '@kbn/react-field';
import React, { useMemo, useState, useCallback, createContext, useContext, useEffect } from 'react';
import type {
  IgnoredField,
  DocumentWithIgnoredFields,
} from '@kbn/streams-schema/src/shared/record_types';
import useAsync from 'react-use/lib/useAsync';
import { recalcColumnWidths } from '../stream_detail_enrichment/utils';
import { useKibana } from '../../../hooks/use_kibana';
import type { SimulationContext } from '../stream_detail_enrichment/state_management/simulation_state_machine';
import { PreviewTableCell, isDocumentWithIgnoredFields } from './preview_table_cell';

export type PreviewTableMode = 'columns' | 'summary';

export const SUMMARY_COLUMN_ID = i18n.translate(
  'xpack.streams.resultPanel.euiDataGrid.summaryColumnId',
  {
    defaultMessage: '(Summary)',
  }
);
const SUMMARY_COLUMN_WIDTH_WITH_SIBLINGS = 600;

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

function RowSelectionCell({
  rowIndex,
  setCellProps,
  highlightColor,
}: {
  rowIndex: number;
  setCellProps: (props: { style: React.CSSProperties }) => void;
  highlightColor: string;
}) {
  const { selectedRowIndex } = useRowSelection();
  const isSelected = selectedRowIndex === rowIndex;

  useEffect(() => {
    if (isSelected) {
      setCellProps({
        style: {
          backgroundColor: highlightColor,
        },
      });
    } else {
      setCellProps({
        style: {},
      });
    }
  }, [isSelected, setCellProps, highlightColor]);

  return <RowSelectionButton rowIndex={rowIndex} />;
}

export const MemoPreviewTable = React.memo(PreviewTable);

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
  showLeadingControlColumns = true,
  cellActions,
  mode = 'columns',
  streamName,
  viewModeToggle,
  dataViewFieldTypes,
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
  showLeadingControlColumns?: boolean;
  cellActions?: EuiDataGridColumnCellAction[];
  mode?: PreviewTableMode;
  streamName?: string;
  viewModeToggle?: {
    currentMode: PreviewTableMode;
    setViewMode: (mode: PreviewTableMode) => void;
    isDisabled: boolean;
  };
  dataViewFieldTypes?: Array<{ name: string; type: string; esType?: string }>;
}) {
  const {
    core,
    dependencies: {
      start: { share, fieldFormats, data },
    },
  } = useKibana();

  // Create dataView for summary mode
  const { value: dataView } = useAsync(async () => {
    if (!streamName) return undefined;
    return data.dataViews.create({ title: streamName });
  }, [streamName, data.dataViews]);
  const { euiTheme: theme } = useEuiTheme();

  // Create a map of field names to their ES types for quick lookup from DataView
  const fieldTypeMap = useMemo(() => {
    const typeMap = new Map<string, string>();

    if (dataViewFieldTypes && dataViewFieldTypes.length > 0) {
      dataViewFieldTypes.forEach((field) => {
        // Use esType if available (more specific), otherwise use type
        const fieldType = field.esType || field.type;
        if (fieldType) {
          typeMap.set(field.name, fieldType);
        }
      });
    }

    return typeMap;
  }, [dataViewFieldTypes]);

  // Determine canonical column order
  const canonicalColumnOrder = useMemo(() => {
    // In columns mode, show regular columns only
    // In summary mode, show summary column + regular columns
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

    if (mode === 'summary') {
      return [SUMMARY_COLUMN_ID, ...allColumns];
    }

    return allColumns;
  }, [columnOrderHint, displayColumns, documents, mode]);

  // Derive default visible columns from canonical order
  const defaultVisibleColumns = useMemo(() => {
    // In summary mode, only show summary column + explicitly enabled columns
    if (mode === 'summary') {
      if (!displayColumns || displayColumns.length === 0) {
        // If no columns specified, show only summary column
        return [SUMMARY_COLUMN_ID];
      }
      const filteredColumns = canonicalColumnOrder.filter(
        (col) => col !== SUMMARY_COLUMN_ID && displayColumns.includes(col)
      );
      return [SUMMARY_COLUMN_ID, ...filteredColumns];
    }

    // In columns mode, show all or filtered columns (no summary)
    const filteredColumns = displayColumns
      ? canonicalColumnOrder.filter(
          (col) => col !== SUMMARY_COLUMN_ID && displayColumns.includes(col)
        )
      : canonicalColumnOrder.filter((col) => col !== SUMMARY_COLUMN_ID);

    return filteredColumns;
  }, [canonicalColumnOrder, displayColumns, mode]);

  // Track user-driven column visibility overrides (null = use defaults)
  const [userVisibleColumns, setUserVisibleColumns] = useState<string[] | null>(null);

  // Reset user overrides when mode changes so defaults are recalculated
  useEffect(() => {
    setUserVisibleColumns(null);
  }, [mode]);

  // Actual visible columns: user overrides take precedence over defaults
  const visibleColumns = userVisibleColumns ?? defaultVisibleColumns;

  const summaryHasSiblings = useMemo(
    () => visibleColumns.some((column) => column !== SUMMARY_COLUMN_ID),
    [visibleColumns]
  );

  const setInternalSetVisibleColumns = useCallback(
    (columns: string[]) => {
      setUserVisibleColumns(columns);
      if (setVisibleColumns) {
        if (mode === 'summary') {
          setVisibleColumns(columns.filter((column) => column !== SUMMARY_COLUMN_ID));
        } else {
          setVisibleColumns(columns);
        }
      }
    },
    [mode, setVisibleColumns]
  );

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
        width: 36,
        headerCellRender: () => null,
        rowCellRender: ({ rowIndex, setCellProps }) => (
          <RowSelectionCell
            rowIndex={rowIndex}
            setCellProps={setCellProps}
            highlightColor={theme.colors.highlight}
          />
        ),
      },
    ],
    [theme.colors.highlight]
  );

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
    return canonicalColumnOrder.map((column) => {
      // Special handling for summary column
      if (column === SUMMARY_COLUMN_ID) {
        return {
          id: column,
          display: (
            <ColumnHeaderTruncateContainer>
              {i18n.translate('xpack.streams.resultPanel.euiDataGrid.summaryColumnLabel', {
                defaultMessage: 'Summary',
              })}
            </ColumnHeaderTruncateContainer>
          ),
          actions: false as false,
          isResizable: true,
          initialWidth:
            columnWidths[column] ??
            (summaryHasSiblings ? SUMMARY_COLUMN_WIDTH_WITH_SIBLINGS : undefined),
        };
      }

      const columnparts = column.split('.');
      // interlave the columnparts with a dot and a breakable non-whitespace character
      const interleavedColumnParts = columnparts.reduce((acc, part, index) => {
        if (index === 0) {
          return [part];
        }
        return [...acc, '.', <wbr key={index} />, part];
      }, [] as React.ReactNode[]);

      // Get the field type from the map
      const fieldType = fieldTypeMap.get(column);

      return {
        id: column,
        display: (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <FieldIcon type={fieldType || 'unknown'} size="s" />
            </EuiFlexItem>
            <EuiFlexItem>
              <ColumnHeaderTruncateContainer wordBreak="normal">
                {interleavedColumnParts}
              </ColumnHeaderTruncateContainer>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
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
      };
    });
  }, [
    cellActions,
    canonicalColumnOrder,
    fieldTypeMap,
    setSorting,
    setVisibleColumns,
    columnWidths,
    summaryHasSiblings,
  ]);

  const [currentRowHeights, setCurrentRowHeights] = useState<
    EuiDataGridRowHeightsOptions | undefined
  >(rowHeightsOptions);

  const renderCustomToolbar: EuiDataGridToolbarProps['renderCustomToolbar'] = useCallback(
    (props: Parameters<NonNullable<EuiDataGridToolbarProps['renderCustomToolbar']>>[0]) => {
      const {
        hasRoomForGridControls,
        columnControl,
        columnSortingControl,
        displayControl,
        fullScreenControl,
        keyboardShortcutsControl,
      } = props;

      const mobileStyles =
        !hasRoomForGridControls &&
        css`
          .euiDataGridToolbarControl__text {
            ${euiScreenReaderOnly()}
          }
        `;

      return (
        <EuiFlexGroup
          responsive={false}
          gutterSize="s"
          justifyContent="spaceBetween"
          alignItems="center"
          css={mobileStyles}
          className="euiDataGrid__controls"
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                {viewModeToggle && (
                  <EuiButtonEmpty
                    data-test-subj="streamsAppPreviewTableViewModeToggle"
                    size="xs"
                    onClick={() => {
                      if (viewModeToggle.currentMode === 'summary') {
                        viewModeToggle.setViewMode('columns');
                      } else {
                        setUserVisibleColumns(null);
                        viewModeToggle.setViewMode('summary');
                      }
                    }}
                    iconType={viewModeToggle.currentMode === 'summary' ? 'eye' : 'eyeClosed'}
                    color="text"
                  >
                    {i18n.translate('xpack.streams.processorOutcomePreview.viewMode.summary', {
                      defaultMessage: 'Summary',
                    })}
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{columnControl}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>{columnSortingControl}</EuiFlexItem>
              <EuiFlexItem grow={false}>{keyboardShortcutsControl}</EuiFlexItem>
              <EuiFlexItem grow={false}>{displayControl}</EuiFlexItem>
              <EuiFlexItem grow={false}>{fullScreenControl}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [viewModeToggle]
  );

  const toolbarVisibilityConfig = useMemo(() => {
    if (!toolbarVisibility) {
      return false;
    }

    return true;
  }, [toolbarVisibility]);

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
        setVisibleColumns: setInternalSetVisibleColumns,
        canDragAndDropColumns: false,
      }}
      sorting={sortingConfig}
      inMemory={sortingConfig ? { level: 'sorting' } : undefined}
      height={height}
      toolbarVisibility={toolbarVisibilityConfig}
      renderCustomToolbar={viewModeToggle ? renderCustomToolbar : undefined}
      rowCount={documents.length}
      rowHeightsOptions={{
        ...currentRowHeights,
        onChange: (newRowHeightOptions) => {
          setCurrentRowHeights(newRowHeightOptions);
        },
      }}
      onColumnResize={onColumnResize}
      renderCellValue={(props) => (
        <PreviewTableCell
          {...props}
          documents={documents}
          mode={mode}
          dataView={dataView}
          currentRowHeights={currentRowHeights}
          renderCellValue={renderCellValue}
          core={core}
          share={share}
          fieldFormats={fieldFormats}
        />
      )}
    />
  );
}
