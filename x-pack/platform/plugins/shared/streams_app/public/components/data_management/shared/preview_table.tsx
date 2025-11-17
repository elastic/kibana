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
  EuiAvatar,
  EuiButtonIcon,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
  EuiButtonGroup,
  euiScreenReaderOnly,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SampleDocument } from '@kbn/streams-schema';
import ColumnHeaderTruncateContainer from '@kbn/unified-data-table/src/components/column_header_truncate_container';
import { FieldIcon } from '@kbn/react-field';
import React, { useMemo, useState, useCallback, createContext, useContext } from 'react';
import type {
  IgnoredField,
  DocumentWithIgnoredFields,
} from '@kbn/streams-schema/src/shared/record_types';
import { LazySummaryColumn } from '@kbn/discover-contextual-components';
import { DataGridDensity, ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';
import useAsync from 'react-use/lib/useAsync';
import { recalcColumnWidths } from '../stream_detail_enrichment/utils';
import type {
  SampleDocumentWithUIAttributes,
  SimulationContext,
} from '../stream_detail_enrichment/state_management/simulation_state_machine';
import { DATA_SOURCES_I18N } from '../stream_detail_enrichment/data_sources_flyout/translations';
import { useDataSourceSelectorById } from '../stream_detail_enrichment/state_management/data_source_state_machine';
import type { EnrichmentDataSourceWithUIAttributes } from '../stream_detail_enrichment/types';
import { useKibana } from '../../../hooks/use_kibana';
import { flattenObjectNestedLast } from '@kbn/object-utils';

const emptyCell = <>&nbsp;</>;

export type PreviewTableMode = 'columns' | 'summary' | 'combined';

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

export const MemoPreviewTable = React.memo(PreviewTable);

function isDocumentWithIgnoredFields(
  doc: SampleDocument | DocumentWithIgnoredFields
): doc is DocumentWithIgnoredFields {
  return 'ignored_fields' in doc && Array.isArray(doc.ignored_fields);
}

const getDocumentFieldNames = (document?: Record<string, unknown>) => {
  if (!document || typeof document !== 'object') {
    return [];
  }
  return Object.keys(document);
};

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
  showRowSourceAvatars?: boolean;
  showLeadingControlColumns?: boolean;
  originalSamples?: SampleDocumentWithUIAttributes[];
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
    if ((mode !== 'summary' && mode !== 'combined') || !streamName) return undefined;
    return data.dataViews.create({ title: streamName });
  }, [mode, streamName, data.dataViews]);
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

  const originalDocumentFields = useMemo(() => {
    if (!originalSamples || originalSamples.length === 0) {
      return undefined;
    }
    const fields = new Set<string>();
    originalSamples.forEach((sample) => {
      const flattenedDocument = flattenObjectNestedLast(sample.document);
      getDocumentFieldNames(flattenedDocument).forEach((key) => fields.add(key));
    });
    return fields;
  }, [originalSamples]);

  const combinedModeNewColumns = useMemo(() => {
    if (mode !== 'combined' || !originalDocumentFields) {
      return undefined;
    }
    const newColumns = new Set<string>();
    documents.forEach((doc) => {
      const document = isDocumentWithIgnoredFields(doc) ? doc.values : doc;
      getDocumentFieldNames(document).forEach((key) => {
        if (!originalDocumentFields.has(key)) {
          newColumns.add(key);
        }
      });
    });
    return newColumns;
  }, [documents, mode, originalDocumentFields]);

  // Determine canonical column order
  const canonicalColumnOrder = useMemo(() => {
    if (mode === 'summary') {
      return [SUMMARY_COLUMN_ID];
    }

    // In columns/combined modes, show regular columns
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

    if (mode === 'combined') {
      return [SUMMARY_COLUMN_ID, ...allColumns];
    }

    return allColumns;
  }, [columnOrderHint, displayColumns, documents, mode]);

  // Derive visibleColumns from canonical order
  const visibleColumns = useMemo(() => {
    // In summary mode, always show only the summary column
    if (mode === 'summary') {
      return [SUMMARY_COLUMN_ID];
    }

    const filteredColumns = displayColumns
      ? canonicalColumnOrder.filter(
          (col) => col !== SUMMARY_COLUMN_ID && displayColumns.includes(col)
        )
      : canonicalColumnOrder.filter((col) => col !== SUMMARY_COLUMN_ID);

    if (mode === 'combined') {
      if (!combinedModeNewColumns) {
        return [SUMMARY_COLUMN_ID];
      }

      if (combinedModeNewColumns.size === 0) {
        return [SUMMARY_COLUMN_ID];
      }

      const newColumnsInOrder = filteredColumns.filter((col) =>
        combinedModeNewColumns.has(col)
      );
      return [SUMMARY_COLUMN_ID, ...newColumnsInOrder];
    }

    return filteredColumns;
  }, [canonicalColumnOrder, combinedModeNewColumns, displayColumns, mode]);

  const summaryHasSiblings = useMemo(
    () => visibleColumns.some((column) => column !== SUMMARY_COLUMN_ID),
    [visibleColumns]
  );

  const internalSetVisibleColumns = useMemo<((columns: string[]) => void) | undefined>(() => {
    if (!setVisibleColumns) {
      return undefined;
    }
    if (mode === 'combined') {
      return (columns: string[]) =>
        setVisibleColumns(columns.filter((column) => column !== SUMMARY_COLUMN_ID));
    }
    return setVisibleColumns;
  }, [mode, setVisibleColumns]);

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

      const viewModeOptions = [
        {
          id: 'columns' as const,
          label: i18n.translate('xpack.streams.processorOutcomePreview.viewMode.columns', {
            defaultMessage: 'Columns',
          }),
        },
        {
          id: 'summary' as const,
          label: i18n.translate('xpack.streams.processorOutcomePreview.viewMode.summary', {
            defaultMessage: 'Summary',
          }),
        },
        {
          id: 'combined' as const,
          label: i18n.translate('xpack.streams.processorOutcomePreview.viewMode.combined', {
            defaultMessage: 'Combined',
          }),
        },
      ];

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
            {viewModeToggle && (
              <EuiButtonGroup
                legend={i18n.translate(
                  'xpack.streams.processorOutcomePreview.viewModeToggle.legend',
                  {
                    defaultMessage: 'Preview view mode',
                  }
                )}
                options={viewModeOptions}
                idSelected={viewModeToggle.currentMode}
                onChange={(id) => viewModeToggle.setViewMode(id as PreviewTableMode)}
                buttonSize="compressed"
                isDisabled={viewModeToggle.isDisabled}
              />
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>{columnControl}</EuiFlexItem>
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
        setVisibleColumns: internalSetVisibleColumns || (() => {}),
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
      renderCellValue={({
        rowIndex,
        columnId,
        setCellProps,
        isDetails,
        isExpanded,
        isExpandable,
        colIndex,
      }) => {
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

        // Special rendering for summary column
        if (
          columnId === SUMMARY_COLUMN_ID &&
          (mode === 'summary' || mode === 'combined') &&
          dataView
        ) {
          // Convert to DataTableRecord format expected by SummaryColumn
          // No normalization - pass documents as-is with OTel fields
          // The kbn-discover-utils will handle OTel field fallbacks
          const dataTableRecord = {
            raw: document,
            flattened: document,
            id: `${rowIndex}-summary`,
          };

          let rowHeight: number | undefined;
          if (currentRowHeights) {
            const { defaultHeight } = currentRowHeights;
            if (defaultHeight === 'auto') {
              rowHeight = ROWS_HEIGHT_OPTIONS.auto;
            } else if (
              defaultHeight &&
              typeof defaultHeight === 'object' &&
              'lineCount' in defaultHeight &&
              defaultHeight.lineCount
            ) {
              rowHeight = defaultHeight.lineCount;
            }
          }

          return (
            <LazySummaryColumn
              dataView={dataView}
              row={dataTableRecord}
              rowIndex={rowIndex}
              columnId={columnId}
              isDetails={isDetails}
              setCellProps={setCellProps}
              isExpandable={isExpandable}
              isExpanded={isExpanded}
              colIndex={colIndex}
              closePopover={() => {}}
              density={DataGridDensity.COMPACT}
              rowHeight={rowHeight}
              shouldShowFieldHandler={() => true}
              core={core}
              share={share}
              fieldFormats={fieldFormats}
            />
          );
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
