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
import { namespacePrefixes, type SampleDocument } from '@kbn/streams-schema';
import ColumnHeaderTruncateContainer from '@kbn/unified-data-table/src/components/column_header_truncate_container';
import React, { useMemo, useState, useCallback, createContext, useContext } from 'react';
import type {
  IgnoredField,
  DocumentWithIgnoredFields,
} from '@kbn/streams-schema/src/shared/record_types';
import { LazySummaryColumn } from '@kbn/discover-contextual-components';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataGridDensity } from '@kbn/unified-data-table';
import { EcsFlat } from '@elastic/ecs';
import { recalcColumnWidths } from '../stream_detail_enrichment/utils';
import type {
  SampleDocumentWithUIAttributes,
  SimulationContext,
} from '../stream_detail_enrichment/state_management/simulation_state_machine';
import { DATA_SOURCES_I18N } from '../stream_detail_enrichment/data_sources_flyout/translations';
import { useDataSourceSelectorById } from '../stream_detail_enrichment/state_management/data_source_state_machine';
import type { EnrichmentDataSourceWithUIAttributes } from '../stream_detail_enrichment/types';
import { useKibana } from '../../../hooks/use_kibana';

const emptyCell = <>&nbsp;</>;

export const SUMMARY_COLUMN_ID = i18n.translate(
  'xpack.streams.resultPanel.euiDataGrid.summaryColumnId',
  {
    defaultMessage: '(Summary)',
  }
);

interface RowSelectionContextType {
  selectedRowIndex?: number;
  onRowSelected?: (rowIndex: number) => void;
}

export const RowSelectionContext = createContext<RowSelectionContextType>({});

const useRowSelection = () => useContext(RowSelectionContext);

const allNamespacesRegex = new RegExp(`^(${namespacePrefixes.join('|')})`);
const otelEquivalentLookupMap = Object.fromEntries(
  Object.entries(EcsFlat).flatMap(([fieldName, field]) => {
    if (!('otel' in field) || !field.otel) {
      return [];
    }
    const otelEquivalentProperty = field.otel.find(
      (otelProperty) => otelProperty.relation === 'equivalent'
    );
    if (
      !otelEquivalentProperty ||
      !('attribute' in otelEquivalentProperty) ||
      !(typeof otelEquivalentProperty.attribute === 'string')
    ) {
      const otlpProperty = field.otel.find((otelProperty) => otelProperty.relation === 'otlp');
      if (
        !otlpProperty ||
        !('otlp_field' in otlpProperty) ||
        !(typeof otlpProperty.otlp_field === 'string')
      ) {
        return [];
      }
      return [
        [otlpProperty.otlp_field === 'body' ? 'body.text' : otlpProperty.otlp_field, fieldName],
      ];
    }

    return [[otelEquivalentProperty.attribute, fieldName]];
  })
);

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
  showSummaryColumn = false,
  dataView,
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
  showSummaryColumn?: boolean;
  dataView?: DataView;
}) {
  const { euiTheme: theme } = useEuiTheme();
  const {
    core,
    dependencies: {
      start: { share, fieldFormats },
    },
  } = useKibana();

  // Determine canonical column order
  const canonicalColumnOrder = useMemo(() => {
    const cols = new Set<string>();

    // Add summary column first if enabled
    if (showSummaryColumn && dataView) {
      cols.add(SUMMARY_COLUMN_ID);
    }

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
      // Keep Summary column first if it's present
      if (a === SUMMARY_COLUMN_ID) return -1;
      if (b === SUMMARY_COLUMN_ID) return 1;

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
  }, [columnOrderHint, displayColumns, documents, showSummaryColumn, dataView]);

  // Derive visibleColumns from canonical order
  const visibleColumns = useMemo(() => {
    if (displayColumns) {
      const filtered = canonicalColumnOrder.filter((col) => displayColumns.includes(col));
      // If no columns are visible and summary column is available, show only summary column
      if (
        filtered.length === 0 &&
        showSummaryColumn &&
        dataView &&
        canonicalColumnOrder.includes(SUMMARY_COLUMN_ID)
      ) {
        return [SUMMARY_COLUMN_ID];
      }
      return filtered;
    }
    return [SUMMARY_COLUMN_ID];
  }, [canonicalColumnOrder, displayColumns, showSummaryColumn, dataView]);

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
      if (column === SUMMARY_COLUMN_ID && showSummaryColumn && dataView) {
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

      return {
        id: column,
        display: (
          <ColumnHeaderTruncateContainer wordBreak="normal">
            {interleavedColumnParts}
          </ColumnHeaderTruncateContainer>
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
    setSorting,
    setVisibleColumns,
    columnWidths,
    showSummaryColumn,
    dataView,
  ]);

  const [currentRowHeights, setCurrentRowHeights] = useState<
    EuiDataGridRowHeightsOptions | undefined
  >(rowHeightsOptions);

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
        if (columnId === SUMMARY_COLUMN_ID && showSummaryColumn && dataView) {
          // remap special names
          const normalizedDocument = Object.fromEntries(
            Object.entries(document).map(([key, value]) => {
              if (namespacePrefixes.some((prefix) => key.startsWith(prefix))) {
                const aliasKey = key.replace(allNamespacesRegex, '');

                const otelEquivalent = otelEquivalentLookupMap[aliasKey];
                if (otelEquivalent) {
                  // Map the value to the OpenTelemetry equivalent
                  return [otelEquivalent, value];
                }
                return [aliasKey, value];
              }
              const otelEquivalent = otelEquivalentLookupMap[key];
              if (otelEquivalent) {
                // Map the value to the OpenTelemetry equivalent
                return [otelEquivalent, value];
              }
              return [key, value];
            })
          );

          // Convert to DataTableRecord format expected by SummaryColumn
          const dataTableRecord = {
            raw: normalizedDocument,
            flattened: normalizedDocument,
            id: `${rowIndex}-summary`,
          };

          let rowHeight: number | undefined;
          if (currentRowHeights) {
            if (
              currentRowHeights.defaultHeight &&
              typeof currentRowHeights.defaultHeight === 'object' &&
              'lineCount' in currentRowHeights.defaultHeight &&
              currentRowHeights.defaultHeight.lineCount
            ) {
              rowHeight = currentRowHeights.defaultHeight.lineCount;
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
              shouldShowFieldHandler={() => false}
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
