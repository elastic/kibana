/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { DataViewSpec, DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import { AggregateQuery, Query, Filter } from '@kbn/es-query';
import { FilterManager } from '@kbn/data-plugin/public';
import { Datatable } from '@kbn/expressions-plugin/common';
import { DOC_TYPE, INDEX_PATTERN_TYPE } from '../../common/constants';
import { VisualizationState, DatasourceStates } from '.';
import { LensDocument } from '../persistence';
import { DatasourceMap, VisualizationMap, Datasource } from '../types';

// This piece of logic is shared between the main editor code base and the inline editor one within the embeddable
export function mergeToNewDoc(
  persistedDoc: LensDocument | undefined,
  visualization: VisualizationState,
  datasourceStates: DatasourceStates,
  query: AggregateQuery | Query,
  filters: Filter[],
  activeDatasourceId: string | null,
  adHocDataViews: Record<string, DataViewSpec>,
  {
    datasourceMap,
    visualizationMap,
    extractFilterReferences,
  }: {
    datasourceMap: DatasourceMap;
    visualizationMap: VisualizationMap;
    extractFilterReferences: FilterManager['extract'];
  }
) {
  const activeVisualization =
    visualization.state && visualization.activeId ? visualizationMap[visualization.activeId] : null;
  const activeDatasource =
    datasourceStates && activeDatasourceId && !datasourceStates[activeDatasourceId].isLoading
      ? datasourceMap[activeDatasourceId]
      : undefined;

  if (!activeDatasource || !activeVisualization) {
    return;
  }

  const activeDatasources: Record<string, Datasource> = Object.keys(datasourceStates).reduce(
    (acc, datasourceId) => ({
      ...acc,
      [datasourceId]: datasourceMap[datasourceId],
    }),
    {}
  );

  const persistibleDatasourceStates: Record<string, unknown> = {};
  const references: SavedObjectReference[] = [];
  const internalReferences: SavedObjectReference[] = [];
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    const { state: persistableState, savedObjectReferences } = datasource.getPersistableState(
      datasourceStates[id].state
    );
    persistibleDatasourceStates[id] = persistableState;
    savedObjectReferences.forEach((r) => {
      if (r.type === INDEX_PATTERN_TYPE && adHocDataViews[r.id]) {
        internalReferences.push(r);
      } else {
        references.push(r);
      }
    });
  });

  let persistibleVisualizationState = visualization.state;
  if (activeVisualization.getPersistableState) {
    const { state: persistableState, savedObjectReferences } =
      activeVisualization.getPersistableState(visualization.state);
    persistibleVisualizationState = persistableState;
    savedObjectReferences.forEach((r) => {
      if (r.type === INDEX_PATTERN_TYPE && adHocDataViews[r.id]) {
        internalReferences.push(r);
      } else {
        references.push(r);
      }
    });
  }

  const persistableAdHocDataViews = Object.fromEntries(
    Object.entries(adHocDataViews).map(([id, dataView]) => {
      const { references: dataViewReferences, state } =
        DataViewPersistableStateService.extract(dataView);
      references.push(...dataViewReferences);
      return [id, state];
    })
  );

  const adHocFilters = filters
    .filter((f) => !references.some((r) => r.type === INDEX_PATTERN_TYPE && r.id === f.meta.index))
    .map((f) => ({ ...f, meta: { ...f.meta, value: undefined } }));

  const referencedFilters = filters.filter((f) =>
    references.some((r) => r.type === INDEX_PATTERN_TYPE && r.id === f.meta.index)
  );

  const { state: persistableFilters, references: filterReferences } =
    extractFilterReferences(referencedFilters);

  references.push(...filterReferences);

  return {
    savedObjectId: persistedDoc?.savedObjectId,
    title: persistedDoc?.title || '',
    description: persistedDoc?.description,
    visualizationType: visualization.activeId!,
    type: DOC_TYPE,
    references,
    state: {
      visualization: persistibleVisualizationState,
      query,
      filters: [...persistableFilters, ...adHocFilters],
      datasourceStates: persistibleDatasourceStates,
      internalReferences,
      adHocDataViews: persistableAdHocDataViews,
    },
  };
}

export function getActiveDataFromDatatable(
  defaultLayerId: string,
  tables: Record<string, Datatable> = {}
) {
  return Object.entries(tables).reduce<Record<string, Datatable>>(
    (acc, [key, value], _index, { length }) => {
      const id = length === 1 ? defaultLayerId : key;
      acc[id] = value as Datatable;
      return acc;
    },
    {}
  );
}
