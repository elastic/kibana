/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Ast } from '@kbn/interpreter';
import { i18n } from '@kbn/i18n';
import { CoreTheme, ThemeServiceStart } from '@kbn/core/public';
import {
  PaletteRegistry,
  CUSTOM_PALETTE,
  PaletteOutput,
  CustomPaletteParams,
  applyPaletteParams,
  getOverridePaletteStops,
} from '@kbn/coloring';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import { IconChartDatatable } from '@kbn/chart-icons';
import { getOriginalId } from '@kbn/transpose-utils';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import useObservable from 'react-use/lib/useObservable';
import { getSortingCriteria } from '@kbn/sort-predicates';
import { getKbnPalettes } from '@kbn/palettes';
import type { FormBasedPersistedState } from '../../datasources/form_based/types';
import type {
  SuggestionRequest,
  Visualization,
  VisualizationSuggestion,
  DatasourceLayers,
  Suggestion,
} from '../../types';
import { TableDimensionDataExtraEditor, TableDimensionEditor } from './components/dimension_editor';
import { TableDimensionEditorAdditionalSection } from './components/dimension_editor_addtional_section';
import type { FormatFactory, LayerType } from '../../../common/types';
import { RowHeightMode } from '../../../common/types';
import { getDefaultSummaryLabel } from '../../../common/expressions/datatable/summary';
import {
  type ColumnState,
  type SortingState,
  type PagingState,
  type CollapseExpressionFunction,
  type DatatableColumnFn,
  type DatatableExpressionFunction,
} from '../../../common/expressions';
import { DataTableToolbar } from './components/toolbar';
import {
  DEFAULT_HEADER_ROW_HEIGHT,
  DEFAULT_HEADER_ROW_HEIGHT_LINES,
  DEFAULT_ROW_HEIGHT_LINES,
} from './components/constants';
import {
  defaultPaletteParams,
  findMinMaxByColumnId,
  getPaletteDisplayColors,
  shouldColorByTerms,
} from '../../shared_components';
import { getColorMappingTelemetryEvents } from '../../lens_ui_telemetry/color_telemetry_helpers';
import { DatatableInspectorTables } from '../../../common/expressions/datatable/datatable_fn';
import { getSimpleColumnType } from './components/table_actions';
export interface DatatableVisualizationState {
  columns: ColumnState[];
  layerId: string;
  layerType: LayerType;
  sorting?: SortingState;
  rowHeight?: RowHeightMode;
  headerRowHeight?: RowHeightMode;
  rowHeightLines?: number;
  headerRowHeightLines?: number;
  paging?: PagingState;
}

const visualizationLabel = i18n.translate('xpack.lens.datatable.label', {
  defaultMessage: 'Table',
});

export const getDatatableVisualization = ({
  paletteService,
  kibanaTheme,
  formatFactory,
}: {
  paletteService: PaletteRegistry;
  kibanaTheme: ThemeServiceStart;
  formatFactory: FormatFactory;
}): Visualization<DatatableVisualizationState> => ({
  id: 'lnsDatatable',

  visualizationTypes: [
    {
      id: 'lnsDatatable',
      icon: IconChartDatatable,
      label: visualizationLabel,
      sortPriority: 5,
      description: i18n.translate('xpack.lens.datatable.visualizationDescription', {
        defaultMessage: 'Organize data in structured rows and columns.',
      }),
    },
  ],

  getVisualizationTypeId() {
    return this.id;
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  clearLayer(state) {
    return {
      ...state,
      columns: [],
    };
  },

  getDescription() {
    return {
      icon: IconChartDatatable,
      label: visualizationLabel,
    };
  },

  switchVisualizationType: (_, state) => state,

  triggers: [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.tableRowContextMenuClick],

  initialize(addNewLayer, state) {
    return (
      state || {
        columns: [],
        layerId: addNewLayer(),
        layerType: LayerTypes.DATA,
      }
    );
  },

  onDatasourceUpdate(state, frame) {
    const datasource = frame?.datasourceLayers?.[state.layerId];
    const paletteMap = new Map(
      paletteService
        .getAll()
        .filter((p) => !p.internal)
        .map((p) => [p.id, p])
    );

    const hasTransposedColumn = state.columns.some(({ isTransposed }) => isTransposed);
    const columns = state.columns.map((column) => {
      if (column.palette) {
        const accessor = column.columnId;
        const currentData = frame?.activeData?.[state.layerId];
        const { dataType, isBucketed } = datasource?.getOperationForColumnId(column.columnId) ?? {};
        const showColorByTerms = shouldColorByTerms(dataType, isBucketed);
        const palette = paletteMap.get(column.palette?.name ?? '');
        const columnsToCheck = hasTransposedColumn
          ? currentData?.columns
              .filter(({ id }) => getOriginalId(id) === accessor)
              .map(({ id }) => id) || []
          : [accessor];
        const minMaxByColumnId = findMinMaxByColumnId(columnsToCheck, currentData);
        const dataBounds = minMaxByColumnId.get(accessor);
        if (palette && !showColorByTerms && !palette?.canDynamicColoring && dataBounds) {
          const newPalette: PaletteOutput<CustomPaletteParams> = {
            type: 'palette',
            name: showColorByTerms ? 'default' : defaultPaletteParams.name,
          };
          return {
            ...column,
            palette: {
              ...newPalette,
              params: {
                stops: applyPaletteParams(paletteService, newPalette, dataBounds),
              },
            },
          };
        }
      }

      return column;
    });

    return {
      ...state,
      columns,
    };
  },

  getSuggestions({
    table,
    state,
    keptLayerIds,
  }: SuggestionRequest<DatatableVisualizationState>): Array<
    VisualizationSuggestion<DatatableVisualizationState>
  > {
    if (
      keptLayerIds.length > 1 ||
      (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
      (state && table.changeType === 'unchanged') ||
      table.columns.some((col) => col.operation.isStaticValue)
    ) {
      return [];
    }
    const oldColumnSettings: Record<string, ColumnState> = {};
    if (state) {
      state.columns.forEach((column) => {
        oldColumnSettings[column.columnId] = column;
      });
    }
    const lastTransposedColumnIndex = table.columns.findIndex((c) =>
      !oldColumnSettings[c.columnId] ? false : !oldColumnSettings[c.columnId]?.isTransposed
    );
    const usesTransposing = state?.columns.some((c) => c.isTransposed);

    const title =
      table.changeType === 'unchanged'
        ? i18n.translate('xpack.lens.datatable.suggestionLabel', {
            defaultMessage: 'As table',
          })
        : i18n.translate('xpack.lens.datatable.visualizationOf', {
            defaultMessage: 'Table {operations}',
            values: {
              operations:
                table.label ||
                table.columns
                  .map((col) => col.operation.label)
                  .join(
                    i18n.translate('xpack.lens.datatable.conjunctionSign', {
                      defaultMessage: ' & ',
                      description:
                        'A character that can be used for conjunction of multiple enumarated items. Make sure to include spaces around it if needed.',
                    })
                  ),
            },
          });

    const changeType = table.changeType;
    const changeFactor =
      changeType === 'reduced' || changeType === 'layers'
        ? 0.3
        : changeType === 'unchanged'
        ? 0.5
        : 1;

    // forcing datatable as a suggestion when there are no metrics (number fields)
    const forceSuggestion = Boolean(table?.notAssignedMetrics);

    return [
      {
        title,
        // table with >= 10 columns will have a score of 0.4, fewer columns reduce score
        score: forceSuggestion ? 1 : (Math.min(table.columns.length, 10) / 10) * 0.4 * changeFactor,
        state: {
          ...(state || {}),
          layerId: table.layerId,
          layerType: LayerTypes.DATA,
          columns: table.columns.map((col, columnIndex) => ({
            ...(oldColumnSettings[col.columnId] || {}),
            isTransposed: usesTransposing && columnIndex < lastTransposedColumnIndex,
            columnId: col.columnId,
          })),
        },
        previewIcon: IconChartDatatable,
        // tables are hidden from suggestion bar, but used for drag & drop and chart switching
        hide: true,
      },
    ];
  },

  /*
  Datatable works differently on text-based datasource and form-based
  - Form-based: It relies on the isBucketed flag to identify groups. It allows only numeric fields
  on the Metrics dimension
  - Text-based: It relies on the isMetric flag to identify groups. It allows all type of fields
  on the Metric dimension in cases where there are no numeric columns
  **/
  getConfiguration({ state, frame }) {
    const theme = kibanaTheme.getTheme();
    const palettes = getKbnPalettes(theme);

    const { sortedColumns, datasource } = getDatasourceAndSortedColumns(
      state,
      frame.datasourceLayers
    );

    const columnMap: Record<string, ColumnState> = {};
    state.columns.forEach((column) => {
      columnMap[column.columnId] = column;
    });

    if (!sortedColumns) {
      return { groups: [] };
    }
    const isTextBasedLanguage = datasource?.isTextBasedLanguage();

    return {
      groups: [
        // In this group we get columns that are not transposed and are not on the metric dimension
        {
          groupId: 'rows',
          groupLabel: i18n.translate('xpack.lens.datatable.breakdownRows', {
            defaultMessage: 'Rows',
          }),
          dimensionEditorGroupLabel: i18n.translate('xpack.lens.datatable.breakdownRow', {
            defaultMessage: 'Row',
          }),
          groupTooltip: i18n.translate('xpack.lens.datatable.breakdownRows.description', {
            defaultMessage:
              'Split table rows by field. This is recommended for high cardinality breakdowns.',
          }),
          layerId: state.layerId,
          accessors: sortedColumns
            .filter((c) => {
              const column = state.columns.find((col) => col.columnId === c);
              if (isTextBasedLanguage) {
                return (
                  !datasource!.getOperationForColumnId(c)?.inMetricDimension &&
                  !column?.isMetric &&
                  !column?.isTransposed
                );
              }
              return datasource!.getOperationForColumnId(c)?.isBucketed && !column?.isTransposed;
            })
            .map((accessor) => {
              const {
                colorMode = 'none',
                palette,
                colorMapping,
                hidden,
                collapseFn,
              } = columnMap[accessor] ?? {};
              const stops = getPaletteDisplayColors(
                paletteService,
                palettes,
                theme.darkMode,
                palette,
                colorMapping
              );
              const hasColoring = colorMode !== 'none' && stops.length > 0;

              return {
                columnId: accessor,
                triggerIconType: hidden
                  ? 'invisible'
                  : hasColoring
                  ? 'colorBy'
                  : collapseFn
                  ? 'aggregate'
                  : undefined,
                palette: hasColoring ? stops : undefined,
              };
            }),
          supportsMoreColumns: true,
          filterOperations: (op) => op.isBucketed,
          dataTestSubj: 'lnsDatatable_rows',
          enableDimensionEditor: true,
          hideGrouping: true,
          nestingOrder: 1,
        },
        // In this group we get columns that are transposed and are not on the metric dimension
        {
          groupId: 'columns',
          groupLabel: i18n.translate('xpack.lens.datatable.breakdownColumns', {
            defaultMessage: 'Split metrics by',
          }),
          dimensionEditorGroupLabel: i18n.translate('xpack.lens.datatable.breakdownColumn', {
            defaultMessage: 'Split metrics by',
          }),
          groupTooltip: i18n.translate('xpack.lens.datatable.breakdownColumns.description', {
            defaultMessage:
              "Split metric columns by field. It's recommended to keep the number of columns low to avoid horizontal scrolling.",
          }),
          layerId: state.layerId,
          accessors: sortedColumns
            .filter((c) => {
              if (isTextBasedLanguage) {
                return state.columns.find((col) => col.columnId === c)?.isTransposed;
              }
              return (
                datasource!.getOperationForColumnId(c)?.isBucketed &&
                state.columns.find((col) => col.columnId === c)?.isTransposed
              );
            })
            .map((accessor) => ({ columnId: accessor })),
          supportsMoreColumns: true,
          filterOperations: (op) => op.isBucketed,
          dataTestSubj: 'lnsDatatable_columns',
          enableDimensionEditor: true,
          hideGrouping: true,
          nestingOrder: 0,
        },
        // In this group we get columns are on the metric dimension
        {
          groupId: 'metrics',
          groupLabel: i18n.translate('xpack.lens.datatable.metrics', {
            defaultMessage: 'Metrics',
          }),
          dimensionEditorGroupLabel: i18n.translate('xpack.lens.datatable.metric', {
            defaultMessage: 'Metric',
          }),
          paramEditorCustomProps: {
            headingLabel: i18n.translate('xpack.lens.datatable.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          layerId: state.layerId,
          accessors: sortedColumns
            .filter((c) => {
              const operation = datasource!.getOperationForColumnId(c);
              if (isTextBasedLanguage) {
                return (
                  operation?.inMetricDimension ||
                  state.columns.find((col) => col.columnId === c)?.isMetric
                );
              }
              return !operation?.isBucketed;
            })
            .map((accessor) => {
              const {
                colorMode = 'none',
                palette,
                colorMapping,
                hidden,
              } = columnMap[accessor] ?? {};
              const stops = getPaletteDisplayColors(
                paletteService,
                palettes,
                theme.darkMode,
                palette,
                colorMapping
              );
              const hasColoring = colorMode !== 'none' && stops.length > 0;

              return {
                columnId: accessor,
                triggerIconType: hidden ? 'invisible' : hasColoring ? 'colorBy' : undefined,
                palette: hasColoring ? stops : undefined,
              };
            }),
          supportsMoreColumns: true,
          filterOperations: (op) => !op.isBucketed,
          isMetricDimension: true,
          requiredMinDimensionCount: 1,
          dataTestSubj: 'lnsDatatable_metrics',
          enableDimensionEditor: true,
        },
      ],
    };
  },

  setDimension({ prevState, columnId, groupId, previousColumn }) {
    if (
      prevState.columns.some(
        (column) =>
          column.columnId === columnId || (previousColumn && column.columnId === previousColumn)
      )
    ) {
      return {
        ...prevState,
        columns: prevState.columns.map((column) => {
          if (column.columnId === columnId || column.columnId === previousColumn) {
            return {
              ...column,
              columnId,
              isTransposed: groupId === 'columns',
              isMetric: groupId === 'metrics',
            };
          }
          return column;
        }),
      };
    }
    return {
      ...prevState,
      columns: [
        ...prevState.columns,
        { columnId, isTransposed: groupId === 'columns', isMetric: groupId === 'metrics' },
      ],
    };
  },
  removeDimension({ prevState, columnId }) {
    return {
      ...prevState,
      columns: prevState.columns.filter((column) => column.columnId !== columnId),
      sorting: prevState.sorting?.columnId === columnId ? undefined : prevState.sorting,
    };
  },
  DimensionEditorComponent(props) {
    const theme = useObservable<CoreTheme>(kibanaTheme.theme$, {
      darkMode: false,
      name: 'amsterdam',
    });
    const palettes = getKbnPalettes(theme);

    return (
      <TableDimensionEditor
        {...props}
        isDarkMode={theme.darkMode}
        palettes={palettes}
        paletteService={paletteService}
      />
    );
  },

  DimensionEditorAdditionalSectionComponent(props) {
    return <TableDimensionEditorAdditionalSection {...props} paletteService={paletteService} />;
  },

  DimensionEditorDataExtraComponent(props) {
    return <TableDimensionDataExtraEditor {...props} paletteService={paletteService} />;
  },

  getSupportedLayers() {
    return [
      {
        type: LayerTypes.DATA,
        label: i18n.translate('xpack.lens.datatable.addLayer', {
          defaultMessage: 'Visualization',
        }),
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return state.layerType;
    }
  },

  toExpression(
    state,
    datasourceLayers,
    { title, description } = {},
    datasourceExpressionsByLayers = {}
  ): Ast | null {
    const { sortedColumns, datasource } = getDatasourceAndSortedColumns(state, datasourceLayers);
    const isTextBasedLanguage = datasource?.isTextBasedLanguage();

    if (
      sortedColumns?.length &&
      !isTextBasedLanguage &&
      sortedColumns.filter((c) => !datasource!.getOperationForColumnId(c)?.isBucketed).length === 0
    ) {
      return null;
    }

    if (!datasourceExpressionsByLayers || Object.keys(datasourceExpressionsByLayers).length === 0) {
      return null;
    }

    const columnMap: Record<string, ColumnState> = {};
    state.columns.forEach((column) => {
      columnMap[column.columnId] = column;
    });

    const columns = sortedColumns!
      .filter((columnId) => datasource!.getOperationForColumnId(columnId))
      .map((columnId) => columnMap[columnId]);

    const datasourceExpression = datasourceExpressionsByLayers[state.layerId];

    const lensCollapseFnAsts = columns
      .filter((c) => c.collapseFn)
      .map((c) =>
        buildExpressionFunction<CollapseExpressionFunction>('lens_collapse', {
          by: columns
            .filter(
              (col) =>
                col.columnId !== c.columnId &&
                datasource!.getOperationForColumnId(col.columnId)?.isBucketed
            )
            .map((col) => col.columnId),
          metric: columns
            .filter((col) => !datasource!.getOperationForColumnId(col.columnId)?.isBucketed)
            .map((col) => col.columnId),
          fn: [c.collapseFn!],
        }).toAst()
      );

    const datatableFnAst = buildExpressionFunction<DatatableExpressionFunction>('lens_datatable', {
      title: title || '',
      description: description || '',
      columns: columns
        .filter((c) => !c.collapseFn)
        .map((column) => {
          const stops = getOverridePaletteStops(paletteService, column.palette);
          const paletteParams = {
            ...column.palette?.params,
            // rewrite colors and stops as two distinct arguments
            colors: stops?.map(({ color }) => color),
            stops:
              column.palette?.params?.name === RowHeightMode.custom
                ? stops?.map(({ stop }) => stop)
                : [],
            reverse: false, // managed at UI level
          };
          const { dataType, isBucketed, sortingHint, inMetricDimension } =
            datasource?.getOperationForColumnId(column.columnId) ?? {};
          const hasNoSummaryRow = column.summaryRow == null || column.summaryRow === 'none';
          const canColor = dataType !== 'date';
          const colorByTerms = shouldColorByTerms(dataType, isBucketed);
          let isTransposable =
            !isTextBasedLanguage &&
            !datasource!.getOperationForColumnId(column.columnId)?.isBucketed;

          if (isTextBasedLanguage) {
            isTransposable = Boolean(column?.isMetric || inMetricDimension);
          }

          const datatableColumnFn = buildExpressionFunction<DatatableColumnFn>(
            'lens_datatable_column',
            {
              columnId: column.columnId,
              hidden: column.hidden,
              oneClickFilter: column.oneClickFilter,
              width: column.width,
              isTransposed: column.isTransposed,
              transposable: isTransposable,
              alignment: column.alignment,
              colorMode: canColor ? column.colorMode ?? 'none' : 'none',
              palette: !canColor
                ? undefined
                : paletteService
                    // The by value palette is a pseudo custom palette that is only custom from params level
                    .get(colorByTerms ? column.palette?.name || CUSTOM_PALETTE : CUSTOM_PALETTE)
                    .toExpression(paletteParams),
              colorMapping:
                canColor && column.colorMapping ? JSON.stringify(column.colorMapping) : undefined,
              summaryRow: hasNoSummaryRow ? undefined : column.summaryRow!,
              summaryLabel: hasNoSummaryRow
                ? undefined
                : column.summaryLabel ?? getDefaultSummaryLabel(column.summaryRow!),
              sortingHint,
            }
          );
          return buildExpression([datatableColumnFn]).toAst();
        }),
      sortingColumnId: state.sorting?.columnId || '',
      sortingDirection: state.sorting?.direction || 'none',
      fitRowToContent: state.rowHeight === RowHeightMode.auto,
      headerRowHeight: state.headerRowHeight ?? DEFAULT_HEADER_ROW_HEIGHT,
      rowHeightLines: state.rowHeightLines ?? DEFAULT_ROW_HEIGHT_LINES,
      headerRowHeightLines: state.headerRowHeightLines ?? DEFAULT_HEADER_ROW_HEIGHT_LINES,
      pageSize: state.paging?.enabled ? state.paging.size : undefined,
    }).toAst();

    return {
      type: 'expression',
      chain: [...(datasourceExpression?.chain ?? []), ...lensCollapseFnAsts, datatableFnAst],
    };
  },

  getTelemetryEventsOnSave(state, prevState) {
    const colorMappingEvents = state.columns.flatMap((col) => {
      const prevColumn = prevState?.columns?.find((prevCol) => prevCol.columnId === col.columnId);
      return getColorMappingTelemetryEvents(col.colorMapping, prevColumn?.colorMapping);
    });

    return colorMappingEvents;
  },

  getRenderEventCounters(state) {
    const events = {
      color_by_value: false,
      summary_row: false,
    };

    state.columns.forEach((column) => {
      if (column.summaryRow && column.summaryRow !== 'none') {
        events.summary_row = true;
      }
      if (column.colorMode && column.colorMode !== 'none') {
        events.color_by_value = true;
      }
    });

    return Object.entries(events).reduce<string[]>((acc, [key, isActive]) => {
      if (isActive) {
        acc.push(`dimension_${key}`);
      }
      return acc;
    }, []);
  },

  ToolbarComponent(props) {
    return <DataTableToolbar {...props} />;
  },

  onEditAction(state, event) {
    switch (event.data.action) {
      case 'sort':
        return {
          ...state,
          sorting: {
            columnId: event.data.columnId,
            direction: event.data.direction,
          },
        };
      case 'toggle':
        const toggleColumnId = event.data.columnId;
        return {
          ...state,
          columns: state.columns.map((column) => {
            if (column.columnId === toggleColumnId) {
              return {
                ...column,
                hidden: !column.hidden,
              };
            } else {
              return column;
            }
          }),
        };
      case 'resize':
        const targetWidth = event.data.width;
        const resizeColumnId = event.data.columnId;
        return {
          ...state,
          columns: state.columns.map((column) => {
            if (column.columnId === resizeColumnId) {
              return {
                ...column,
                width: targetWidth,
              };
            } else {
              return column;
            }
          }),
        };
      case 'pagesize':
        return {
          ...state,
          paging: {
            enabled: state.paging?.enabled || false,
            size: event.data.size,
          },
        };
      default:
        return state;
    }
  },
  getSuggestionFromConvertToLensContext({ suggestions, context }) {
    const allSuggestions = suggestions as Array<
      Suggestion<DatatableVisualizationState, FormBasedPersistedState>
    >;
    const suggestion: Suggestion<DatatableVisualizationState, FormBasedPersistedState> = {
      ...allSuggestions[0],
      datasourceState: {
        ...allSuggestions[0].datasourceState,
        layers: allSuggestions.reduce(
          (acc, s) => ({
            ...acc,
            ...s.datasourceState?.layers,
          }),
          {}
        ),
      },
      visualizationState: {
        ...allSuggestions[0].visualizationState,
        ...context.configuration,
      },
    };
    return suggestion;
  },

  getExportDatatables(state, datasourceLayers = {}, activeData) {
    const columnMap = new Map(state.columns.map((c) => [c.columnId, c]));
    const datatable =
      activeData?.[DatatableInspectorTables.Transpose] ??
      activeData?.[DatatableInspectorTables.Default];
    if (!datatable) return [];

    const columns = datatable.columns.filter(({ id }) => !columnMap.get(getOriginalId(id))?.hidden);
    let rows = datatable.rows;

    const sortColumn =
      state.sorting?.columnId && columns.find(({ id }) => id === state.sorting?.columnId);
    const sortDirection = state.sorting?.direction;

    if (sortColumn && sortDirection && sortDirection !== 'none') {
      const datasource = datasourceLayers[state.layerId];
      const schemaType =
        datasource?.getOperationForColumnId?.(sortColumn.id)?.sortingHint ??
        getSimpleColumnType(sortColumn.meta);
      const sortingCriteria = getSortingCriteria(
        schemaType,
        sortColumn.id,
        formatFactory(sortColumn.meta?.params)
      );
      rows = [...rows].sort((rA, rB) => sortingCriteria(rA, rB, sortDirection));
    }

    return [
      {
        ...datatable,
        columns,
        rows,
      },
    ];
  },

  getVisualizationInfo(state) {
    const visibleMetricColumns = state.columns.filter(
      (c) => !c.hidden && c.colorMode && c.colorMode !== 'none'
    );

    return {
      layers: [
        {
          layerId: state.layerId,
          layerType: state.layerType,
          chartType: 'table',
          ...this.getDescription(state),
          palette:
            // if multiple columns have color by value, do not show the palette for now: see #154349
            visibleMetricColumns.length > 1
              ? undefined
              : visibleMetricColumns[0]?.palette?.params?.stops?.map(({ color }) => color),
          dimensions: state.columns.map((column) => {
            let name = i18n.translate('xpack.lens.datatable.metric', {
              defaultMessage: 'Metric',
            });
            let dimensionType = 'Metric';
            if (!column.transposable) {
              if (column.isTransposed) {
                name = i18n.translate('xpack.lens.datatable.breakdownColumns', {
                  defaultMessage: 'Split metrics by',
                });
                dimensionType = 'split_metrics';
              } else {
                name = i18n.translate('xpack.lens.datatable.breakdownRow', {
                  defaultMessage: 'Row',
                });
                dimensionType = 'split_rows';
              }
            }
            return {
              dimensionType,
              id: column.columnId,
              name,
            };
          }),
        },
      ],
    };
  },
});

function getDatasourceAndSortedColumns(
  state: DatatableVisualizationState,
  datasourceLayers: DatasourceLayers
) {
  const datasource = datasourceLayers[state.layerId];
  const originalOrder = datasource?.getTableSpec().map(({ columnId }) => columnId);
  // When we add a column it could be empty, and therefore have no order
  const sortedColumns = Array.from(
    new Set(originalOrder?.concat(state.columns.map(({ columnId }) => columnId)))
  );

  return { datasource, sortedColumns };
}
