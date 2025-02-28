/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CoreStart } from '@kbn/core/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { AggregateQuery, isOfAggregateQueryType, getAggregateQueryMode } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core/public';
import type { ExpressionsStart, DatatableColumn } from '@kbn/expressions-plugin/public';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import { TextBasedDataPanel } from './components/datapanel';
import { TextBasedDimensionEditor } from './components/dimension_editor';
import { TextBasedDimensionTrigger } from './components/dimension_trigger';
import { toExpression } from './to_expression';
import {
  DatasourceDimensionEditorProps,
  DatasourceDataPanelProps,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  DataType,
  TableChangeType,
  DatasourceDimensionTriggerProps,
  DataSourceInfo,
  UserMessage,
  OperationMetadata,
} from '../../types';
import { generateId } from '../../id_generator';
import type {
  TextBasedPrivateState,
  TextBasedPersistedState,
  TextBasedLayerColumn,
  TextBasedField,
} from './types';
import type { Datasource, DatasourceSuggestion } from '../../types';
import { getUniqueLabelGenerator, nonNullable } from '../../utils';
import { onDrop, getDropProps } from './dnd';
import { removeColumn } from './remove_column';
import {
  canColumnBeUsedBeInMetricDimension,
  isNotNumeric,
  isNumeric,
  MAX_NUM_OF_COLUMNS,
} from './utils';
import {
  getColumnsFromCache,
  addColumnsToCache,
  retrieveLayerColumnsFromCache,
} from './fieldlist_cache';
import { TEXT_BASED_LANGUAGE_ERROR } from '../../user_messages_ids';

function getLayerReferenceName(layerId: string) {
  return `textBasedLanguages-datasource-layer-${layerId}`;
}

const getSelectedFieldsFromColumns = memoizeOne(
  (columns: TextBasedLayerColumn[]) =>
    columns
      .map((c) => {
        if ('fieldName' in c) {
          return c.fieldName;
        }
      })
      .filter(nonNullable),
  isEqual
);

const getUnchangedSuggestionTable = (
  state: TextBasedPrivateState,
  allColumns: TextBasedLayerColumn[],
  id: string
) => {
  return {
    state: {
      ...state,
    },
    table: {
      changeType: 'unchanged' as TableChangeType,
      isMultiRow: false,
      layerId: id,
      columns:
        state.layers[id].columns?.map((f) => {
          const inMetricDimension = canColumnBeUsedBeInMetricDimension(allColumns, f?.meta?.type);
          return {
            columnId: f.columnId,
            operation: {
              dataType: f?.meta?.type as DataType,
              label: f.fieldName,
              isBucketed: Boolean(isNotNumeric(f)),
              // makes non-number fields to act as metrics, used for datatable suggestions
              ...(inMetricDimension && {
                inMetricDimension,
              }),
            },
          };
        }) ?? [],
    },
    keptLayerIds: [id],
  };
};

const getSuggestionsByRules = (
  state: TextBasedPrivateState,
  allColumns: TextBasedLayerColumn[],
  id: string,
  rules: Array<{ isBucketed: boolean; allowAll?: boolean }>
) => {
  const columnsToKeep = rules.reduce<TextBasedLayerColumn[]>((acc, rule) => {
    const fn = rule.isBucketed ? isNotNumeric : isNumeric;
    let column = state.layers[id].columns?.find(
      (col) => fn(col) && !acc.some((c) => c.columnId === col.columnId)
    );
    if (!column && rule.allowAll) {
      column = state.layers[id].columns?.find(
        (col) => !acc.some((c) => c.columnId === col.columnId)
      );
    }
    return column ? [...acc, column] : acc;
  }, []);

  if (!columnsToKeep.length || columnsToKeep.length !== rules.length) {
    return;
  }
  return {
    state: {
      ...state,
      layers: {
        [id]: {
          ...state.layers[id],
          columns: columnsToKeep,
        },
      },
    },
    table: {
      changeType: 'reduced' as TableChangeType,
      isMultiRow: false,
      layerId: id,
      columns:
        columnsToKeep?.map((f, i) => {
          const inMetricDimension = canColumnBeUsedBeInMetricDimension(allColumns, f?.meta?.type);
          return {
            columnId: f.columnId,
            operation: {
              dataType: f?.meta?.type as DataType,
              label: f.fieldName,
              isBucketed: !!rules[i].isBucketed,
              // makes non-number fields to act as metrics, used for datatable suggestions
              ...(inMetricDimension && {
                inMetricDimension,
              }),
            },
          };
        }) ?? [],
    },
    keptLayerIds: [id],
  };
};

export function getTextBasedDatasource({
  core,
  storage,
  data,
  expressions,
  dataViews,
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  dataViews: DataViewsPublicPluginStart;
}) {
  const getSuggestionsForState = (state: TextBasedPrivateState) => {
    return Object.entries(state.layers)?.flatMap(([id, layer]) => {
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
        .reduce<Array<DatasourceSuggestion<TextBasedPrivateState>>>((acc, cur) => {
          if (acc.find(({ table }) => isEqual(table.columns, cur.table.columns))) {
            return acc;
          }
          return [...acc, cur];
        }, []);
    });
  };
  const getSuggestionsForVisualizeField = (
    state: TextBasedPrivateState,
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
          columnId: c.variable ?? c.id,
          fieldName: c.variable ? `?${c.variable}` : c.id,
          variable: c.variable,
          label: c.name,
          customLabel: c.id !== c.name,
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
  const TextBasedDatasource: Datasource<TextBasedPrivateState, TextBasedPersistedState> = {
    id: 'textBased',

    checkIntegrity: () => {
      return [];
    },
    getUserMessages: (state) => {
      const errors: Error[] = [];

      Object.values(state.layers).forEach((layer) => {
        if (layer.errors && layer.errors.length > 0) {
          errors.push(...layer.errors);
        }
      });
      return errors.map((err) => {
        const message: UserMessage = {
          uniqueId: TEXT_BASED_LANGUAGE_ERROR,
          severity: 'error',
          fixableInEditor: true,
          displayLocations: [{ id: 'visualization' }, { id: 'textBasedLanguagesQueryInput' }],
          shortMessage: err.message,
          longMessage: err.message,
        };
        return message;
      });
    },
    initialize(
      state?: TextBasedPersistedState,
      savedObjectReferences?,
      context?,
      indexPatternRefs?,
      indexPatterns?
    ) {
      const patterns = indexPatterns ? Object.values(indexPatterns) : [];
      const refs = patterns.map((p) => {
        return {
          id: p.id,
          title: p.title,
          timeField: p.timeFieldName,
        };
      });

      const initState = state || { layers: {} };
      return {
        ...initState,
        indexPatternRefs: refs,
        initialContext: context,
      };
    },

    syncColumns({ state }) {
      // TODO implement this for real
      return state;
    },

    onRefreshIndexPattern() {},

    getUsedDataViews: (state) => {
      return Object.values(state.layers)
        .map(({ index }) => index)
        .filter(nonNullable);
    },

    getPersistableState({ layers }: TextBasedPrivateState) {
      const savedObjectReferences: SavedObjectReference[] = [];
      Object.entries(layers).forEach(([layerId, { index, ...persistableLayer }]) => {
        if (index) {
          savedObjectReferences.push({
            type: 'index-pattern',
            id: index,
            name: getLayerReferenceName(layerId),
          });
        }
      });
      return { state: { layers }, savedObjectReferences };
    },
    insertLayer(state: TextBasedPrivateState, newLayerId: string) {
      const layer = Object.values(state?.layers)?.[0];
      const query = layer?.query;
      const index =
        layer?.index ??
        (JSON.parse(localStorage.getItem('lens-settings') || '{}').indexPatternId ||
          state.indexPatternRefs[0].id);
      return {
        ...state,
        layers: {
          ...state.layers,
          [newLayerId]: blankLayer(index, query),
        },
      };
    },
    createEmptyLayer() {
      return {
        indexPatternRefs: [],
        layers: {},
      };
    },

    cloneLayer(state, layerId, newLayerId, getNewId) {
      return {
        ...state,
      };
    },

    removeLayer(state: TextBasedPrivateState, layerId: string) {
      const newLayers = {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          columns: [],
        },
      };

      return {
        removedLayerIds: [layerId],
        newState: {
          ...state,
          layers: newLayers,
        },
      };
    },

    clearLayer(state: TextBasedPrivateState, layerId: string) {
      return {
        removedLayerIds: [],
        newState: {
          ...state,
          layers: {
            ...state.layers,
            [layerId]: { ...state.layers[layerId], columns: [] },
          },
        },
      };
    },

    getLayers(state: TextBasedPrivateState) {
      return state && state.layers ? Object.keys(state?.layers) : [];
    },
    isTimeBased: (state, indexPatterns) => {
      if (!state) return false;
      const { layers } = state;
      return (
        Boolean(layers) &&
        Object.values(layers).some((layer) => {
          return layer.index && Boolean(indexPatterns[layer.index]?.timeFieldName);
        })
      );
    },
    getUsedDataView: (state: TextBasedPrivateState, layerId?: string) => {
      if (!layerId || !state.layers[layerId].index) {
        const layers = Object.values(state.layers);
        return layers?.[0]?.index as string;
      }
      return state.layers[layerId].index as string;
    },

    removeColumn,

    toExpression: (state, layerId, indexPatterns, dateRange, searchSessionId) => {
      return toExpression(state, layerId);
    },
    getSelectedFields(state) {
      return getSelectedFieldsFromColumns(
        Object.values(state?.layers)?.flatMap((l) => Object.values(l.columns))
      );
    },

    DataPanelComponent(props: DatasourceDataPanelProps<TextBasedPrivateState>) {
      const layerFields = TextBasedDatasource?.getSelectedFields?.(props.state);
      return (
        <TextBasedDataPanel
          data={data}
          dataViews={dataViews}
          expressions={expressions}
          layerFields={layerFields}
          {...props}
        />
      );
    },

    DimensionTriggerComponent: (props: DatasourceDimensionTriggerProps<TextBasedPrivateState>) => {
      const columnLabelMap = TextBasedDatasource.uniqueLabels(props.state, props.indexPatterns);
      return (
        <TextBasedDimensionTrigger
          {...props}
          expressions={expressions}
          columnLabelMap={columnLabelMap}
        />
      );
    },

    getRenderEventCounters(state: TextBasedPrivateState): string[] {
      const context = state?.initialContext;
      if (context && 'query' in context && context.query && isOfAggregateQueryType(context.query)) {
        const language = getAggregateQueryMode(context.query);
        // it will eventually log render_lens_esql_chart
        return [`${language}_chart`];
      }
      return [];
    },

    DimensionEditorComponent: (props: DatasourceDimensionEditorProps<TextBasedPrivateState>) => {
      return <TextBasedDimensionEditor {...props} expressions={expressions} />;
    },

    LayerPanelComponent: (props: DatasourceLayerPanelProps<TextBasedPrivateState>) => {
      return null;
    },

    uniqueLabels(state: TextBasedPrivateState) {
      const layers = state.layers;
      const columnLabelMap = {} as Record<string, string>;
      const uniqueLabelGenerator = getUniqueLabelGenerator();

      Object.values(layers).forEach((layer) => {
        if (!layer.columns) {
          return;
        }
        Object.values(layer.columns).forEach((column) => {
          columnLabelMap[column.columnId] = uniqueLabelGenerator(column.fieldName);
        });
      });

      return columnLabelMap;
    },
    getDropProps,
    onDrop,
    getPublicAPI({ state, layerId, indexPatterns }: PublicAPIProps<TextBasedPrivateState>) {
      return {
        datasourceId: 'textBased',

        getTableSpec: () => {
          return (
            state.layers[layerId]?.columns.map((column) => ({
              columnId: column.columnId,
              fields: [column.fieldName],
            })) || []
          );
        },
        getOperationForColumnId: (columnId: string) => {
          const layer = state.layers[layerId];
          const column = layer?.columns?.find((c) => c.columnId === columnId);
          const columnLabelMap = TextBasedDatasource.uniqueLabels(state, indexPatterns);
          let scale: OperationMetadata['scale'] = 'ordinal';
          switch (column?.meta?.type) {
            case 'date':
              scale = 'interval';
              break;
            case 'number':
              scale = 'ratio';
              break;
            default:
              scale = 'ordinal';
              break;
          }

          if (column) {
            return {
              dataType: column?.meta?.type as DataType,
              label: columnLabelMap[columnId] ?? column?.fieldName,
              isBucketed: Boolean(isNotNumeric(column)),
              inMetricDimension: column.inMetricDimension,
              hasTimeShift: false,
              hasReducedTimeRange: false,
              scale,
            };
          }
          return null;
        },
        getVisualDefaults: () => ({}),
        isTextBasedLanguage: () => true,
        getMaxPossibleNumValues: (columnId) => {
          return null;
        },
        getSourceId: () => {
          const layer = state.layers[layerId];
          return layer.index;
        },
        getFilters: () => {
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
        },
        hasDefaultTimeField: () => false,
      };
    },
    getDatasourceSuggestionsForField(state, draggedField) {
      const layers = Object.values(state.layers);
      const query = layers?.[0]?.query;
      const fieldList = query ? getColumnsFromCache(query) : [];
      const field = fieldList?.find((f) => f.id === (draggedField as TextBasedField).id);
      if (!field) return [];
      return Object.entries(state.layers)?.map(([id, layer]) => {
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
                ...state.layers[id],
                columns: [...layer.columns, newColumn],
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
      return [];
    },
    getDatasourceSuggestionsForVisualizeField: getSuggestionsForVisualizeField,
    getDatasourceSuggestionsFromCurrentState: getSuggestionsForState,
    getDatasourceSuggestionsForVisualizeCharts: getSuggestionsForState,
    isEqual: (
      persistableState1: TextBasedPersistedState,
      references1: SavedObjectReference[],
      persistableState2: TextBasedPersistedState,
      references2: SavedObjectReference[]
    ) => isEqual(persistableState1, persistableState2),
    getDatasourceInfo: async (state, references, dataViewsService) => {
      const indexPatterns: DataView[] = [];
      for (const { index } of Object.values(state.layers)) {
        if (index) {
          const dataView = await dataViewsService?.get(index);
          if (dataView) {
            indexPatterns.push(dataView);
          }
        }
      }
      return Object.entries(state.layers).reduce<DataSourceInfo[]>((acc, [key, layer]) => {
        const columns = Object.entries(layer.columns).map(([colId, col]) => {
          return {
            id: colId,
            role: isNotNumeric(col) ? ('split' as const) : ('metric' as const),
            operation: {
              dataType: col?.meta?.type as DataType,
              label: col.fieldName,
              isBucketed: Boolean(isNotNumeric(col)),
              hasTimeShift: false,
              hasReducedTimeRange: false,
              fields: [col.fieldName],
              type: col.meta?.type || 'unknown',
              filter: undefined,
            },
          };
        });

        acc.push({
          layerId: key,
          columns,
          dataView: indexPatterns?.find((dataView) => dataView.id === layer.index),
        });

        return acc;
      }, []);
    },
  };

  return TextBasedDatasource;
}

function blankLayer(index: string, query?: AggregateQuery) {
  return {
    index,
    query,
    columns: [],
  };
}
