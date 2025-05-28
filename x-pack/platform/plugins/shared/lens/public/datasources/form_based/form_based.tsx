/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart, SavedObjectReference } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { Query, TimeRange } from '@kbn/es-query';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { flatten, isEqual } from 'lodash';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { DataPublicPluginStart, UI_SETTINGS } from '@kbn/data-plugin/public';
import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { EuiButton } from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { type DraggingIdentifier } from '@kbn/dom-drag-drop';
import { DimensionTrigger } from '@kbn/visualization-ui-components';
import memoizeOne from 'memoize-one';
import { DatatableColumn, ExpressionsStart } from '@kbn/expressions-plugin/public';
import type {
  DatasourceDimensionEditorProps,
  DatasourceDimensionTriggerProps,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  OperationDescriptor,
  FramePublicAPI,
  IndexPatternField,
  IndexPattern,
  IndexPatternRef,
  DataSourceInfo,
  UserMessage,
  StateSetter,
  IndexPatternMap,
  DatasourceDataPanelProps,
  DatasourceSuggestion,
  DataType,
  TableChangeType,
  DatasourceDimensionDropHandlerProps,
} from '../../types';
import {
  changeIndexPattern,
  changeLayerIndexPattern,
  extractReferences,
  injectReferences,
  loadInitialState,
  onRefreshIndexPattern,
  renameIndexPattern,
  triggerActionOnIndexPatternChange,
} from './loader';
import { toExpression } from './to_expression';
import { toExpression as toExpressionESQL } from './esql_layer/to_expression';
import { FormBasedDimensionEditor, getDropProps, onDrop } from './dimension_panel';
import { FormBasedDataPanel } from './datapanel';
import {
  getDatasourceSuggestionsForField,
  getDatasourceSuggestionsFromCurrentState,
  getDatasourceSuggestionsForVisualizeField,
  getDatasourceSuggestionsForVisualizeCharts,
} from './form_based_suggestions';

import {
  getFiltersInLayer,
  getSearchWarningMessages,
  getVisualDefaultsForLayer,
  isColumnInvalid,
  cloneLayer,
  getNotifiableFeatures,
  getUnsupportedOperationsWarningMessage,
} from './utils';
import { getUniqueLabelGenerator, isDraggedDataViewField, nonNullable } from '../../utils';
import { hasField, normalizeOperationDataType } from './pure_utils';
import { LayerPanel } from './layerpanel';
import {
  DateHistogramIndexPatternColumn,
  GenericIndexPatternColumn,
  getCurrentFieldsForOperation,
  getErrorMessages,
  insertNewColumn,
  operationDefinitionMap,
  TermsIndexPatternColumn,
} from './operations';
import {
  copyColumn,
  getColumnOrder,
  getReferenceRoot,
  reorderByGroups,
} from './operations/layer_helpers';
import {
  FormBasedPrivateState,
  DataViewDragDropOperation,
  CombinedFormBasedPersistedState,
  CombinedFormBasedPrivateState,
  isFormBasedLayer,
  isTextBasedLayer,
  hasTextBasedLayers,
  TextBasedField,
} from './types';
import { mergeLayer, mergeLayers } from './state_helpers';
import type { Datasource, VisualizeEditorContext } from '../../types';
import { deleteColumn, isReferenced } from './operations';
import { GeoFieldWorkspacePanel } from '../../editor_frame_service/editor_frame/workspace_panel/geo_field_workspace_panel';
import { getStateTimeShiftWarningMessages } from './time_shift_utils';
import { getPrecisionErrorWarningMessages } from './utils';
import { DOCUMENT_FIELD_NAME } from '../../../common/constants';
import { isColumnOfType } from './operations/definitions/helpers';
import { LayerSettingsPanel } from './layer_settings';
import { FormBasedLayer, LastValueIndexPatternColumn } from '../..';
import { filterAndSortUserMessages } from '../../app_plugin/get_application_user_messages';
import { EDITOR_INVALID_DIMENSION } from '../../user_messages_ids';
import { getLongMessage } from '../../user_messages_utils';
import { TextBasedDimensionEditor } from './esql_layer/components/dimension_editor';
import { TextBasedDimensionTrigger } from './esql_layer/components/dimension_trigger';
import {
  addColumnsToCache,
  getColumnsFromCache,
  retrieveLayerColumnsFromCache,
} from './esql_layer/fieldlist_cache';
import { generateId } from '../../id_generator';
import {
  canColumnBeUsedBeInMetricDimension,
  MAX_NUM_OF_COLUMNS,
  isNotNumeric,
  isNumeric,
  getOperationForColumnIdESQL,
} from './esql_layer/utils';
export type { OperationType, GenericIndexPatternColumn } from './operations';
export { deleteColumn } from './operations';

import { getSuggestionsByRules, getUnchangedSuggestionTable } from './esql_layer/suggestions';

function wrapOnDot(str?: string) {
  // u200B is a non-width white-space character, which allows
  // the browser to efficiently word-wrap right after the dot
  // without us having to draw a lot of extra DOM elements, etc
  return str ? str.replace(/\./g, '.\u200B') : '';
}

const getSelectedFieldsFromColumns = memoizeOne(
  (columns: GenericIndexPatternColumn[]) =>
    columns
      .flatMap((c) => {
        if (operationDefinitionMap[c.operationType]?.getCurrentFields) {
          return operationDefinitionMap[c.operationType]?.getCurrentFields?.(c) || [];
        } else if ('sourceField' in c) {
          return c.sourceField;
        }
      })
      .filter(nonNullable),
  isEqual
);

function getSortingHint(column: GenericIndexPatternColumn, dataView?: IndexPattern | DataView) {
  if (column.dataType === 'string') {
    const fieldTypes =
      'sourceField' in column ? dataView?.getFieldByName(column.sourceField)?.esTypes : undefined;
    return fieldTypes?.[0] || undefined;
  }
  if (isColumnOfType<LastValueIndexPatternColumn>('last_value', column)) {
    return column.dataType;
  }
}

export const removeColumn: Datasource<CombinedFormBasedPrivateState>['removeColumn'] = ({
  prevState,
  layerId,
  columnId,
  indexPatterns,
}) => {
  const layer = prevState.layers[layerId];
  if (layer && isFormBasedLayer(layer)) {
    const indexPattern = indexPatterns?.[layer.indexPatternId];
    if (!indexPattern) {
      throw new Error('indexPatterns is not passed to the function');
    }
    return mergeLayer({
      state: prevState,
      layerId,
      newLayer: deleteColumn({
        layer,
        columnId,
        indexPattern,
      }),
    });
  } else {
    return prevState;
  }
};

export function columnToOperation(
  column: GenericIndexPatternColumn,
  uniqueLabel?: string,
  dataView?: IndexPattern | DataView
): OperationDescriptor {
  const { dataType, label, isBucketed, scale, operationType, timeShift, reducedTimeRange } = column;

  return {
    dataType: normalizeOperationDataType(dataType),
    isBucketed,
    scale,
    label: uniqueLabel || label,
    isStaticValue: operationType === 'static_value',
    sortingHint: getSortingHint(column, dataView),
    hasTimeShift: Boolean(timeShift),
    hasReducedTimeRange: Boolean(reducedTimeRange),
    interval: isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column)
      ? column.params.interval
      : undefined,
    hasArraySupport:
      isColumnOfType<LastValueIndexPatternColumn>('last_value', column) &&
      column.params.showArrayValues,
  };
}

export type { FormatColumnArgs, TimeScaleArgs, CounterRateArgs } from '../../../common/expressions';

export {
  getSuffixFormatter,
  unitSuffixesLong,
  suffixFormatterId,
} from '../../../common/suffix_formatter';

export function getFormBasedDatasource({
  core,
  storage,
  data,
  unifiedSearch,
  share,
  dataViews,
  fieldFormats,
  charts,
  dataViewFieldEditor,
  uiActions,
  expressions,
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  share?: SharePluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginSetup;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  uiActions: UiActionsStart;
  expressions: ExpressionsStart;
}) {
  const { uiSettings, featureFlags } = core;

  const DATASOURCE_ID = 'formBased';
  const ALIAS_IDS = ['indexpattern'];

  const getSuggestionsForState = (state: CombinedFormBasedPrivateState) => {
    return Object.entries(state.layers)?.flatMap((entry) => {
      const [id] = entry;
      const layer = entry[1];
      if (isFormBasedLayer(layer)) {
        return [];
      }
      const allColumns = retrieveLayerColumnsFromCache(layer.columns, layer.query);

      if (!allColumns.length && layer.query) {
        const layerColumns = layer.columns.map((c) => ({
          id: c.columnId,
          name: c.fieldName,
          meta: c.meta,
        })) as DatatableColumn[];
        addColumnsToCache(layer.query, layerColumns);
      }

      const unchangedSuggestionTable = getUnchangedSuggestionTable(state, allColumns, id);

      // we are trying here to cover the most common cases for the charts we offer
      const metricTable = getSuggestionsByRules(state, allColumns, id, [{ isBucketed: false }]);
      const metricBucketTable = getSuggestionsByRules(state, allColumns, id, [
        { isBucketed: false },
        { isBucketed: true, allowAll: true },
      ]);
      const metricBucketBucketTable = getSuggestionsByRules(state, allColumns, id, [
        { isBucketed: false },
        { isBucketed: true, allowAll: true },
        { isBucketed: true, allowAll: true },
      ]);

      return [unchangedSuggestionTable, metricBucketBucketTable, metricBucketTable, metricTable]
        .filter(nonNullable)
        .reduce<Array<DatasourceSuggestion<CombinedFormBasedPrivateState>>>((acc, cur) => {
          if (acc.find(({ table }) => isEqual(table.columns, cur.table.columns))) {
            return acc;
          }
          return [...acc, cur];
        }, []);
    });
  };
  const getSuggestionsForVisualizeField = (
    state: CombinedFormBasedPrivateState,
    indexPatternId: string,
    fieldName: string
  ) => {
    const context = state.initialContext;
    // on text based mode we offer suggestions for the query and not for a specific field
    if (fieldName) return [];
    if (context && 'dataViewSpec' in context && context.dataViewSpec.title && context.query) {
      const newLayerId = generateId();
      const textBasedQueryColumns = context.textBasedColumns?.slice(0, MAX_NUM_OF_COLUMNS) ?? [];
      // Number fields are assigned automatically as metrics (!isBucketed). There are cases where the query
      // will not return number fields. In these cases we want to suggest a datatable
      // Datatable works differently in this case. On the metrics dimension can be all type of fields
      const hasNumberTypeColumns = textBasedQueryColumns?.some(isNumeric);
      const newColumns = textBasedQueryColumns.map((c) => {
        const inMetricDimension = canColumnBeUsedBeInMetricDimension(
          textBasedQueryColumns,
          c?.meta?.type
        );
        return {
          columnId: c.id,
          fieldName: c.name,
          meta: c.meta,
          // makes non-number fields to act as metrics, used for datatable suggestions
          ...(inMetricDimension && {
            inMetricDimension,
          }),
        };
      });

      addColumnsToCache(context.query, textBasedQueryColumns);

      const index = context.dataViewSpec.id ?? context.dataViewSpec.title;
      const query = context.query;
      const updatedState = {
        ...state,
        initialContext: undefined,
        ...(context.dataViewSpec.id
          ? {
              indexPatternRefs: [
                {
                  id: context.dataViewSpec.id,
                  title: context.dataViewSpec.title,
                  timeField: context.dataViewSpec.timeFieldName,
                },
              ],
            }
          : {}),
        layers: {
          ...state.layers,
          [newLayerId]: {
            type: 'esql',
            index,
            query,
            columns: newColumns ?? [],
            timeField: context.dataViewSpec.timeFieldName,
          },
        },
      };

      return [
        {
          state: {
            ...updatedState,
          },
          table: {
            changeType: 'initial' as TableChangeType,
            isMultiRow: false,
            notAssignedMetrics: !hasNumberTypeColumns,
            layerId: newLayerId,
            columns:
              newColumns?.map((f) => {
                return {
                  columnId: f.columnId,
                  operation: {
                    dataType: f?.meta?.type as DataType,
                    label: f.fieldName,
                    isBucketed: Boolean(isNotNumeric(f)),
                  },
                };
              }) ?? [],
          },
          keptLayerIds: [newLayerId],
        },
      ];
    }

    return [];
  };

  // Not stateful. State is persisted to the frame
  const formBasedDatasource: Datasource<
    CombinedFormBasedPrivateState,
    CombinedFormBasedPersistedState,
    Query
  > = {
    id: DATASOURCE_ID,
    alias: ALIAS_IDS,

    initialize(
      persistedState?: CombinedFormBasedPersistedState,
      references?: SavedObjectReference[],
      initialContext?: VisualizeFieldContext | VisualizeEditorContext,
      indexPatternRefs?: IndexPatternRef[],
      indexPatterns?: Record<string, IndexPattern>
    ) {
      return loadInitialState({
        persistedState,
        references,
        defaultIndexPatternId: uiSettings.get('defaultIndex'),
        storage,
        initialContext,
        indexPatternRefs,
        indexPatterns,
      });
    },

    getPersistableState(state: CombinedFormBasedPrivateState) {
      return extractReferences(state);
    },

    insertLayer(
      state: CombinedFormBasedPrivateState,
      newLayerId: string,
      linkToLayers: string[] | undefined
    ) {
      return {
        ...state,
        layers: {
          ...state.layers,
          [newLayerId]: blankLayer(state.currentIndexPatternId, linkToLayers),
        },
      };
    },

    createEmptyLayer(indexPatternId: string) {
      return {
        currentIndexPatternId: indexPatternId,
        layers: {},
        indexPatternRefs: [],
      };
    },

    cloneLayer(state, layerId, newLayerId, getNewId) {
      return {
        ...state,
        layers: cloneLayer(state.layers, layerId, newLayerId, getNewId),
      };
    },

    removeLayer(state: CombinedFormBasedPrivateState, layerId: string) {
      const newLayers = { ...state.layers };
      delete newLayers[layerId];
      const removedLayerIds: string[] = [layerId];

      // delete layers linked to this layer
      Object.keys(newLayers).forEach((id) => {
        const layer = newLayers[id];
        if (!layer || isTextBasedLayer(layer)) {
          return;
        }
        const linkedLayers = 'linkToLayers' in layer ? layer.linkToLayers : [];
        if (linkedLayers && linkedLayers.includes(layerId)) {
          delete newLayers[id];
          removedLayerIds.push(id);
        }
      });

      return {
        removedLayerIds,
        newState: {
          ...state,
          layers: newLayers,
        },
      };
    },

    clearLayer(state: CombinedFormBasedPrivateState, layerId: string) {
      const newLayers = { ...state.layers };

      const removedLayerIds: string[] = [];
      // delete layers linked to this layer
      Object.keys(newLayers).forEach((id) => {
        const layer = newLayers[id];
        if (!layer || isTextBasedLayer(layer)) {
          return;
        }
        const linkedLayers = 'linkToLayers' in layer ? layer.linkToLayers : [];
        if (linkedLayers && linkedLayers.includes(layerId)) {
          delete newLayers[id];
          removedLayerIds.push(id);
        }
      });

      const layer = newLayers[layerId];
      if (!layer || isTextBasedLayer(layer)) {
        return {
          removedLayerIds,
          newState: {
            ...state,
            layers: newLayers,
          },
        };
      }

      const linkedLayers = 'linkToLayers' in layer ? layer.linkToLayers : [];
      return {
        removedLayerIds,
        newState: {
          ...state,
          layers: {
            ...newLayers,
            [layerId]: blankLayer(state.currentIndexPatternId, linkedLayers),
          },
        },
      };
    },

    getLayers(state: CombinedFormBasedPrivateState) {
      return Object.keys(state?.layers);
    },

    removeColumn,

    initializeDimension(
      state,
      layerId,
      indexPatterns,
      { columnId, groupId, staticValue, autoTimeField, visualizationGroups }
    ) {
      const layer = state.layers[layerId];
      if (layer && isFormBasedLayer(layer)) {
        const indexPattern = indexPatterns[layer.indexPatternId];
        let ret = state;

        if (staticValue != null) {
          ret = mergeLayer({
            state,
            layerId,
            newLayer: insertNewColumn({
              layer,
              op: 'static_value',
              columnId,
              field: undefined,
              indexPattern,
              visualizationGroups,
              initialParams: { params: { value: staticValue } },
              targetGroup: groupId,
            }),
          });
        }

        if (autoTimeField && indexPattern.timeFieldName) {
          ret = mergeLayer({
            state,
            layerId,
            newLayer: insertNewColumn({
              layer,
              op: 'date_histogram',
              columnId,
              field: indexPattern.fields.find((field) => field.name === indexPattern.timeFieldName),
              indexPattern,
              visualizationGroups,
              targetGroup: groupId,
            }),
          });
        }

        return ret;
      } else {
        return state;
      }
    },

    syncColumns({ state, links, indexPatterns, getDimensionGroups }) {
      const filteredLayers = Object.entries(state.layers).filter(([_, layer]) =>
        isFormBasedLayer(layer)
      );
      let modifiedLayers = Object.fromEntries(filteredLayers) as Record<string, FormBasedLayer>;
      links.forEach((link) => {
        const source: DataViewDragDropOperation = {
          ...link.from,
          dataView: indexPatterns[modifiedLayers[link.from.layerId]?.indexPatternId],
          filterOperations: () => true,
        };

        const target: DataViewDragDropOperation = {
          ...link.to,
          dataView: indexPatterns[modifiedLayers[link.to.layerId]?.indexPatternId],
          filterOperations: () => true,
        };

        modifiedLayers = copyColumn({
          layers: modifiedLayers,
          target,
          source,
        }) as Record<string, FormBasedLayer>;

        const updatedColumnOrder = reorderByGroups(
          getDimensionGroups(target.layerId),
          getColumnOrder(modifiedLayers[target.layerId]),
          target.groupId,
          target.columnId
        );

        modifiedLayers = {
          ...modifiedLayers,
          [target.layerId]: {
            ...modifiedLayers[target.layerId],
            columnOrder: updatedColumnOrder,
            columns: modifiedLayers[target.layerId].columns,
          },
        };
      });

      const newState = mergeLayers({
        state,
        newLayers: modifiedLayers,
      });

      links
        .filter((link) => {
          const layer = newState.layers[link.from.layerId];
          if (layer && isFormBasedLayer(layer)) {
            return isColumnOfType<TermsIndexPatternColumn>(
              'terms',
              layer.columns[link.from.columnId]
            );
          }
          return false;
        })
        .forEach(({ from, to }) => {
          const fromLayer = newState.layers[from.layerId];
          if (fromLayer && isFormBasedLayer(fromLayer)) {
            const fromColumn = fromLayer.columns[from.columnId] as TermsIndexPatternColumn;
            if (fromColumn.params.orderBy.type === 'column') {
              const fromOrderByColumnId = fromColumn.params.orderBy.columnId;
              const orderByColumnLink = links.find(
                ({ from: { columnId } }) => columnId === fromOrderByColumnId
              );

              if (orderByColumnLink) {
                // order the synced column by the dimension which is linked to the column that the original column was ordered by
                const toLayer = newState.layers[to.layerId];
                if (toLayer && isFormBasedLayer(toLayer)) {
                  const toColumn = toLayer.columns[to.columnId] as TermsIndexPatternColumn;
                  toColumn.params.orderBy = {
                    type: 'column',
                    columnId: orderByColumnLink.to.columnId,
                  };
                }
              }
            }
          }
        });

      return newState;
    },

    getSelectedFields(state) {
      return getSelectedFieldsFromColumns(
        Object.values(state?.layers)?.flatMap((l) => Object.values(l.columns))
      );
    },

    toExpression: (
      state,
      layerId,
      indexPatterns,
      dateRange,
      nowInstant,
      searchSessionId,
      forceDSL
    ) => {
      if (state.layers[layerId] && isTextBasedLayer(state.layers[layerId])) {
        return toExpressionESQL(state, layerId);
      }

      return toExpression(
        state,
        layerId,
        indexPatterns,
        uiSettings,
        featureFlags,
        dateRange,
        nowInstant,
        searchSessionId,
        forceDSL
      );
    },

    LayerSettingsComponent(props) {
      if (props.layerId && isTextBasedLayer(props.state.layers[props.layerId])) {
        return null;
      }
      return <LayerSettingsPanel {...props} />;
    },
    DataPanelComponent(props: DatasourceDataPanelProps<CombinedFormBasedPrivateState, Query>) {
      const { onChangeIndexPattern, ...otherProps } = props;
      const layerFields = formBasedDatasource?.getSelectedFields?.(props.state);

      return (
        <FormBasedDataPanel
          data={data}
          dataViews={dataViews}
          fieldFormats={fieldFormats}
          charts={charts}
          indexPatternFieldEditor={dataViewFieldEditor}
          {...otherProps}
          core={core}
          uiActions={uiActions}
          onIndexPatternRefresh={onRefreshIndexPattern}
          layerFields={layerFields}
        />
      );
    },
    uniqueLabels(state: CombinedFormBasedPrivateState, indexPatternsMap: IndexPatternMap) {
      const layers = state.layers;
      const columnLabelMap = {} as Record<string, string>;

      const uniqueLabelGenerator = getUniqueLabelGenerator();

      Object.values(layers).forEach((layer) => {
        if (isFormBasedLayer(layer)) {
          if (!layer.columns) {
            return;
          }
          Object.entries(layer.columns).forEach(([columnId, column]) => {
            columnLabelMap[columnId] = uniqueLabelGenerator(
              column.customLabel
                ? column.label
                : operationDefinitionMap[column.operationType].getDefaultLabel(
                    column,
                    layer.columns,
                    indexPatternsMap[layer.indexPatternId]
                  )
            );
          });
        } else if (isTextBasedLayer(layer)) {
          Object.values(layer.columns).forEach((column) => {
            columnLabelMap[column.columnId] = uniqueLabelGenerator(column.fieldName);
          });
        }
      });

      return columnLabelMap;
    },

    DimensionTriggerComponent: (
      props: DatasourceDimensionTriggerProps<CombinedFormBasedPrivateState>
    ) => {
      const columnLabelMap = formBasedDatasource.uniqueLabels(props.state, props.indexPatterns);
      const uniqueLabel = columnLabelMap[props.columnId];
      const formattedLabel = wrapOnDot(uniqueLabel);

      if (props.layerId && isTextBasedLayer(props.state.layers[props.layerId])) {
        return (
          <TextBasedDimensionTrigger
            {...props}
            expressions={expressions}
            columnLabelMap={columnLabelMap}
          />
        );
      }

      return <DimensionTrigger id={props.columnId} label={formattedLabel} />;
    },

    DimensionEditorComponent: (
      props: DatasourceDimensionEditorProps<CombinedFormBasedPrivateState>
    ) => {
      const columnLabelMap = formBasedDatasource.uniqueLabels(props.state, props.indexPatterns);

      if (props.layerId && isTextBasedLayer(props.state.layers[props.layerId])) {
        return <TextBasedDimensionEditor {...props} expressions={expressions} />;
      }

      return (
        <FormBasedDimensionEditor
          uiSettings={uiSettings}
          storage={storage}
          fieldFormats={fieldFormats}
          http={core.http}
          data={data}
          unifiedSearch={unifiedSearch}
          dataViews={dataViews}
          uniqueLabel={columnLabelMap[props.columnId]}
          notifications={core.notifications}
          {...props}
        />
      );
    },

    LayerPanelComponent: (props: DatasourceLayerPanelProps<CombinedFormBasedPrivateState>) => {
      const { onChangeIndexPattern, ...otherProps } = props;

      const layer = props.state.layers[props.layerId];
      if (!layer || isTextBasedLayer(layer)) {
        return null;
      }

      return (
        <LayerPanel
          onChangeIndexPattern={(indexPatternId) => {
            triggerActionOnIndexPatternChange({
              indexPatternId,
              state: props.state,
              layerId: props.layerId,
              uiActions,
            });
            onChangeIndexPattern(indexPatternId, DATASOURCE_ID, props.layerId);
          }}
          {...otherProps}
        />
      );
    },

    getDropProps,
    onDrop: (props) => {
      if (props.state && !hasTextBasedLayers(props.state)) {
        return onDrop(props as DatasourceDimensionDropHandlerProps<FormBasedPrivateState>);
      }
    },

    getCustomWorkspaceRenderer: (
      state: CombinedFormBasedPrivateState,
      dragging: DraggingIdentifier,
      indexPatterns: Record<string, IndexPattern>
    ) => {
      if (dragging.field === undefined || dragging.indexPatternId === undefined) {
        return undefined;
      }

      const indexPattern = indexPatterns[dragging.indexPatternId as string];
      const draggedField = dragging as DraggingIdentifier & {
        field: IndexPatternField;
        indexPatternId: string;
      };
      const geoFieldType =
        draggedField.field.esTypes &&
        draggedField.field.esTypes.find((esType) => {
          return ['geo_point', 'geo_shape'].includes(esType);
        });
      return geoFieldType
        ? () => {
            return (
              <GeoFieldWorkspacePanel
                uiActions={uiActions}
                fieldType={geoFieldType}
                indexPattern={indexPattern}
                fieldName={draggedField.field.name}
              />
            );
          }
        : undefined;
    },

    updateCurrentIndexPatternId: ({ state, indexPatternId, setState }) => {
      setState({
        ...state,
        currentIndexPatternId: indexPatternId,
      });
    },

    onRefreshIndexPattern,
    onIndexPatternChange(state, indexPatterns, indexPatternId, layerId) {
      if (layerId) {
        const layersToChange = [
          layerId,
          ...Object.entries(state.layers)
            .map(([possiblyLinkedId, layer]) =>
              isFormBasedLayer(layer) && layer.linkToLayers?.includes(layerId)
                ? possiblyLinkedId
                : ''
            )
            .filter(Boolean),
        ];

        return changeLayerIndexPattern({
          indexPatternId,
          layerIds: layersToChange,
          state,
          replaceIfPossible: true,
          storage,
          indexPatterns,
        });
      }
      return changeIndexPattern({ indexPatternId, state, storage, indexPatterns });
    },
    onIndexPatternRename: (state, oldIndexPatternId, newIndexPatternId) => {
      return renameIndexPattern({ state, oldIndexPatternId, newIndexPatternId });
    },
    getRenderEventCounters(state: CombinedFormBasedPrivateState): string[] {
      const additionalEvents = {
        time_shift: false,
        filter: false,
      };
      const operations = flatten(
        Object.values(state?.layers ?? {}).map((l) =>
          Object.values(l.columns).map((c) => {
            if (c.timeShift) {
              additionalEvents.time_shift = true;
            }
            if (c.filter) {
              additionalEvents.filter = true;
            }
            return c.operationType;
          })
        )
      );

      return [
        ...operations,
        ...Object.entries(additionalEvents).reduce<string[]>((acc, [key, isActive]) => {
          if (isActive) {
            acc.push(key);
          }
          return acc;
        }, []),
      ].map((item) => `dimension_${item}`);
    },

    // Reset the temporary invalid state when closing the editor, but don't
    // update the state if it's not needed
    updateStateOnCloseDimension: ({ state, layerId }) => {
      const layer = state.layers[layerId];
      if (!layer || isTextBasedLayer(layer)) {
        return state;
      }
      if (!Object.values(layer.incompleteColumns || {}).length) {
        return;
      }
      return mergeLayer({
        state,
        layerId,
        newLayer: { ...layer, incompleteColumns: undefined },
      });
    },

    getPublicAPI({ state, layerId, indexPatterns }: PublicAPIProps<CombinedFormBasedPrivateState>) {
      const columnLabelMap = formBasedDatasource.uniqueLabels(state, indexPatterns);
      const layer = state.layers[layerId];

      const visibleColumnIds = isFormBasedLayer(layer)
        ? layer.columnOrder.filter((colId) => !isReferenced(layer, colId))
        : [];

      return {
        datasourceId: DATASOURCE_ID,
        datasourceAliasIds: ALIAS_IDS,
        getTableSpec: () => {
          // consider also referenced columns in this case
          // but map fields to the top referencing column
          if (!layer || isTextBasedLayer(layer)) {
            return (
              layer?.columns.map((column) => ({
                columnId: column.columnId,
                fields: [column.fieldName],
              })) || []
            );
          }
          const fieldsPerColumn: Record<string, string[]> = {};
          Object.keys(layer.columns).forEach((colId) => {
            const visibleColumnId = getReferenceRoot(layer, colId);
            fieldsPerColumn[visibleColumnId] = fieldsPerColumn[visibleColumnId] || [];

            const column = layer.columns[colId];
            if (isColumnOfType<TermsIndexPatternColumn>('terms', column)) {
              fieldsPerColumn[visibleColumnId].push(
                ...[column.sourceField].concat(column.params.secondaryFields ?? [])
              );
            }
            if ('sourceField' in column && column.sourceField !== DOCUMENT_FIELD_NAME) {
              fieldsPerColumn[visibleColumnId].push(column.sourceField);
            }
          });
          return visibleColumnIds.map((colId, i) => ({
            columnId: colId,
            fields: [...new Set(fieldsPerColumn[colId] || [])],
          }));
        },
        isTextBasedLanguage: () => {
          return Boolean(layer && isTextBasedLayer(layer));
        },
        getOperationForColumnId: (columnId: string) => {
          if (!layer) {
            return null;
          }
          if (isTextBasedLayer(layer)) {
            return getOperationForColumnIdESQL(
              state,
              layerId,
              columnId,
              indexPatterns,
              this.uniqueLabels
            );
          }
          if (layer && layer.columns[columnId]) {
            if (!isReferenced(layer, columnId)) {
              return columnToOperation(
                layer.columns[columnId],
                columnLabelMap[columnId],
                indexPatterns[layer.indexPatternId]
              );
            }
          }
          return null;
        },
        getSourceId: () => {
          return layer.indexPatternId;
        },
        getFilters: (activeData: FramePublicAPI['activeData'], timeRange?: TimeRange) => {
          if (!layer || isTextBasedLayer(layer)) {
            return {
              enabled: {
                kuery: [],
                lucene: [],
              },
              disabled: {
                kuery: [],
                lucene: [],
              },
            };
          }
          return getFiltersInLayer(
            layer,
            visibleColumnIds,
            activeData?.[layerId],
            indexPatterns[layer.indexPatternId],
            timeRange
          );
        },
        getVisualDefaults: () => {
          if (!layer || isTextBasedLayer(layer)) {
            return {};
          }
          return getVisualDefaultsForLayer(layer);
        },
        getMaxPossibleNumValues: (columnId) => {
          if (!layer || isTextBasedLayer(layer)) {
            return null;
          }
          if (layer && layer.columns[columnId]) {
            const column = layer.columns[columnId];
            return (
              operationDefinitionMap[column.operationType].getMaxPossibleNumValues?.(column) ?? null
            );
          }
          return null;
        },
        hasDefaultTimeField: () =>
          Boolean(layer.indexPatternId && indexPatterns[layer.indexPatternId].timeFieldName),
      };
    },
    getDatasourceSuggestionsForField(state, draggedField, filterLayers, indexPatterns) {
      const layers = Object.values(state.layers);
      if (layers?.[0] && isTextBasedLayer(layers[0])) {
        const query = layers[0].query;
        const fieldList = query ? getColumnsFromCache(query) : [];
        const field = fieldList?.find((f) => f.id === (draggedField as TextBasedField).id);
        if (!field) return [];
        const suggestions = Object.entries(state.layers)?.map(([id, layer]) => {
          if (isFormBasedLayer(layer)) {
            return;
          }
          const newId = generateId();
          const newColumn = {
            columnId: newId,
            fieldName: field?.name ?? '',
            meta: field?.meta,
          };
          return {
            state: {
              ...state,
              layers: {
                ...state.layers,
                [id]: {
                  ...layer,
                  columns: layer.columns.concat(newColumn),
                },
              },
            },
            table: {
              changeType: 'initial' as TableChangeType,
              isMultiRow: false,
              layerId: id,
              columns: [
                ...layer.columns?.map((f) => {
                  return {
                    columnId: f.columnId,
                    operation: {
                      dataType: f?.meta?.type as DataType,
                      label: f.fieldName,
                      isBucketed: Boolean(isNotNumeric(f)),
                    },
                  };
                }),
                {
                  columnId: newId,
                  operation: {
                    dataType: field?.meta?.type as DataType,
                    label: field?.name ?? '',
                    isBucketed: Boolean(isNotNumeric(field)),
                  },
                },
              ],
            },
            keptLayerIds: [id],
          };
        });
        return suggestions.filter(nonNullable);
      }
      if (hasTextBasedLayers(state)) {
        return [];
      }

      return isDraggedDataViewField(draggedField)
        ? (getDatasourceSuggestionsForField(
            state,
            draggedField.indexPatternId,
            draggedField.field,
            indexPatterns,
            filterLayers
          ) as Array<DatasourceSuggestion<CombinedFormBasedPrivateState>>)
        : [];
    },
    getDatasourceSuggestionsFromCurrentState: (state, indexPatterns, filterFn, activeData) => {
      if (hasTextBasedLayers(state)) {
        return getSuggestionsForState(state);
      }

      return getDatasourceSuggestionsFromCurrentState(state, indexPatterns, filterFn);
    },
    getDatasourceSuggestionsForVisualizeField: (
      state,
      indexPatternId,
      fieldName,
      indexPatterns
    ) => {
      if (state.initialContext || hasTextBasedLayers(state)) {
        return getSuggestionsForVisualizeField(state, indexPatternId, fieldName) as Array<
          DatasourceSuggestion<CombinedFormBasedPrivateState>
        >;
      }
      return getDatasourceSuggestionsForVisualizeField(
        state,
        indexPatternId,
        fieldName,
        indexPatterns
      ) as Array<DatasourceSuggestion<CombinedFormBasedPrivateState>>;
    },
    getDatasourceSuggestionsForVisualizeCharts: (state, context, indexPatterns) => {
      if (hasTextBasedLayers(state)) {
        return getSuggestionsForState(state);
      }
      return getDatasourceSuggestionsForVisualizeCharts(state, context, indexPatterns) as Array<
        DatasourceSuggestion<CombinedFormBasedPrivateState>
      >;
    },

    getUserMessages(state, { frame: framePublicAPI, setState, visualizationInfo }) {
      if (!state) {
        return [];
      }

      const layerErrorMessages = getLayerErrorMessages(state, framePublicAPI, setState, core, data);

      const dimensionErrorMessages = getInvalidDimensionErrorMessages(
        state,
        layerErrorMessages,
        (layerId, columnId) => {
          const layer = state.layers[layerId];
          if (!layer || isTextBasedLayer(layer)) {
            return false;
          }
          const column = layer.columns[columnId];
          const indexPattern = framePublicAPI.dataViews.indexPatterns[layer.indexPatternId];
          if (!column || !indexPattern) {
            // this is a different issue that should be catched earlier
            return false;
          }
          return isColumnInvalid(
            layer,
            column,
            columnId,
            indexPattern,
            framePublicAPI.dateRange,
            uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET)
          );
        }
      );

      const timeShiftWarningMessages = getStateTimeShiftWarningMessages(
        data.datatableUtilities,
        state,
        framePublicAPI
      );

      const precisionErrorWarningMsg = getPrecisionErrorWarningMessages(
        data.datatableUtilities,
        state,
        framePublicAPI,
        core.docLinks,
        setState
      );

      const unsupportedOpsWarningMsg = getUnsupportedOperationsWarningMessage(
        state,
        framePublicAPI,
        core.docLinks
      );

      const infoMessages = getNotifiableFeatures(state, framePublicAPI, visualizationInfo);

      return layerErrorMessages.concat(
        dimensionErrorMessages,
        timeShiftWarningMessages,
        precisionErrorWarningMsg,
        unsupportedOpsWarningMsg,
        infoMessages
      );
    },

    getSearchWarningMessages: (state, warning, request, response) => {
      return getSearchWarningMessages(state, warning, request, response, core.theme);
    },

    checkIntegrity: (state, indexPatterns) => {
      const ids = Object.values(state.layers || {})
        .filter(isFormBasedLayer)
        .map(({ indexPatternId }) => indexPatternId);
      return ids.filter((id) => !indexPatterns[id]);
    },
    isTimeBased: (state, indexPatterns) => {
      if (!state) return false;
      const { layers } = state;
      return (
        Boolean(layers) &&
        Object.values(layers)
          .filter(isFormBasedLayer)
          .some((layer) => {
            return (
              Boolean(indexPatterns[layer.indexPatternId]?.timeFieldName) ||
              layer.columnOrder
                .filter((colId) => layer.columns[colId].isBucketed)
                .some((colId) => {
                  const column = layer.columns[colId];
                  return (
                    isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column) &&
                    !column.params.ignoreTimeRange
                  );
                })
            );
          })
      );
    },
    isEqual: (
      persistableState1: CombinedFormBasedPersistedState,
      references1: SavedObjectReference[],
      persistableState2: CombinedFormBasedPersistedState,
      references2: SavedObjectReference[]
    ) =>
      isEqual(
        injectReferences(persistableState1, references1),
        injectReferences(persistableState2, references2)
      ),
    getUsedDataView: (state: CombinedFormBasedPrivateState, layerId?: string) => {
      if (!layerId) {
        return state.currentIndexPatternId;
      }
      return state.layers[layerId].indexPatternId ?? state.currentIndexPatternId;
    },
    getUsedDataViews: (state) => {
      return Object.values(state.layers)
        .filter(isFormBasedLayer)
        .map(({ indexPatternId }) => indexPatternId);
    },
    injectReferencesToLayers: (state, references) => {
      const layers =
        references && state ? injectReferences(state, references).layers : state?.layers;
      return {
        ...state,
        layers,
      };
    },

    getDatasourceInfo: async (state, references, dataViewsService) => {
      const layers = references ? injectReferences(state, references).layers : state.layers;
      const indexPatterns: DataView[] = await Promise.all(
        Object.values(layers)
          .filter(isFormBasedLayer)
          .map(({ indexPatternId }) => dataViewsService?.get(indexPatternId))
          .filter(nonNullable)
      );
      return Object.entries(layers).reduce<DataSourceInfo[]>((acc, [key, layer]) => {
        const dataView = indexPatterns?.find(
          (indexPattern) => indexPattern.id === layer.indexPatternId
        );

        const columns = Object.entries(layer.columns).map(([colId, col]) => {
          const fields = hasField(col) ? getCurrentFieldsForOperation(col) : undefined;
          return {
            id: colId,
            role: col.isBucketed ? ('split' as const) : ('metric' as const),
            operation: {
              ...columnToOperation(col, undefined, dataView),
              type: col.operationType,
              fields,
              filter: col.filter,
            },
          };
        });

        acc.push({
          layerId: key,
          columns,
          dataView,
        });

        return acc;
      }, []);
    },
  };

  return formBasedDatasource;
}

function blankLayer(indexPatternId: string, linkToLayers?: string[]): FormBasedLayer {
  return {
    indexPatternId,
    linkToLayers,
    columns: {},
    columnOrder: [],
    sampling: 1,
    ignoreGlobalFilters: false,
  };
}

function getLayerErrorMessages(
  state: CombinedFormBasedPrivateState,
  framePublicAPI: FramePublicAPI,
  setState: StateSetter<CombinedFormBasedPrivateState, unknown> | undefined,
  core: CoreStart,
  data: DataPublicPluginStart
): UserMessage[] {
  const indexPatterns = framePublicAPI.dataViews.indexPatterns;

  const layerErrors: UserMessage[][] = Object.entries(state.layers)
    .filter(([_, layer]) => layer.indexPatternId && !!indexPatterns[layer.indexPatternId])
    .map(([layerId, layer]) =>
      (
        getErrorMessages(
          layer,
          indexPatterns[layer.indexPatternId ?? ''],
          state,
          layerId,
          core,
          data
        ) ?? []
      ).map((error) => {
        const message: UserMessage = {
          uniqueId: typeof error === 'string' ? error : error.uniqueId,
          severity: 'error',
          fixableInEditor: true,
          displayLocations:
            typeof error !== 'string' && error.displayLocations
              ? error.displayLocations
              : [{ id: 'visualization' }],
          shortMessage: '',
          longMessage:
            typeof error === 'string' ? (
              error
            ) : (
              <>
                {error.message}
                {error.fixAction && setState && (
                  <EuiButton
                    data-test-subj="errorFixAction"
                    onClick={async () => {
                      const newState = await error.fixAction?.newState(framePublicAPI);
                      if (newState) {
                        setState(newState);
                      }
                    }}
                  >
                    {error.fixAction?.label}
                  </EuiButton>
                )}
              </>
            ),
        };

        return message;
      })
    );

  let errorMessages: UserMessage[];
  if (layerErrors.length <= 1) {
    // Single layer case, no need to explain more
    errorMessages = layerErrors[0]?.length ? layerErrors[0] : [];
  } else {
    errorMessages = layerErrors.flatMap((errors, index) => {
      return errors.map((error) => {
        // we will prepend each error with the layer number
        if (error.displayLocations.find((location) => location.id === 'visualization')) {
          const message: UserMessage = {
            ...error,
            shortMessage: i18n.translate('xpack.lens.indexPattern.layerErrorWrapper', {
              defaultMessage: 'Layer {position} error: {wrappedMessage}',
              values: {
                position: index + 1,
                wrappedMessage: error.shortMessage,
              },
            }),
            longMessage: (
              <FormattedMessage
                id="xpack.lens.indexPattern.layerErrorWrapper"
                defaultMessage="Layer {position} error: {wrappedMessage}"
                values={{
                  position: index + 1,
                  wrappedMessage: getLongMessage(error),
                }}
              />
            ),
          };

          return message;
        }

        return error;
      });
    });
  }

  return errorMessages;
}

function getInvalidDimensionErrorMessages(
  state: CombinedFormBasedPrivateState,
  currentErrorMessages: UserMessage[],
  isInvalidColumn: (layerId: string, columnId: string) => boolean
) {
  // generate messages for invalid columns
  const columnErrorMessages: UserMessage[] = Object.keys(state.layers)
    .map((layerId) => {
      const messages: UserMessage[] = [];
      for (const columnId of Object.keys(state.layers[layerId].columns)) {
        if (
          filterAndSortUserMessages(currentErrorMessages, 'dimensionButton', {
            dimensionId: columnId,
          }).length > 0
        ) {
          // there is already a more specific user message assigned to this column, so no need
          // to add the default "is invalid" messaging
          continue;
        }

        if (isInvalidColumn(layerId, columnId)) {
          messages.push({
            uniqueId: EDITOR_INVALID_DIMENSION,
            severity: 'error',
            displayLocations: [{ id: 'dimensionButton', dimensionId: columnId }],
            fixableInEditor: true,
            shortMessage: '',
            longMessage: (
              <p>
                {i18n.translate('xpack.lens.configure.invalidConfigTooltip', {
                  defaultMessage: 'Invalid configuration.',
                })}
                <br />
                {i18n.translate('xpack.lens.configure.invalidConfigTooltipClick', {
                  defaultMessage: 'Click for more details.',
                })}
              </p>
            ),
          });
        }
      }

      return messages;
    })
    .flat();

  return columnErrorMessages;
}
