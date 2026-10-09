/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import type { HttpStart } from '@kbn/core/public';
import { EsqlSource, getOrRegisterEsqlDataView } from '@kbn/data-source';
import {
  getProjectRoutingFromEsqlQuery,
  getSourceCommandQueryFromESQLQuery,
} from '@kbn/esql-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { LensRuntimeState, TextBasedPersistedState } from '@kbn/lens-common';
import { getIndexPatternsObjects } from '../../utils';
import type { LensEmbeddableStartServices } from '../types';

type DataViewsService = LensEmbeddableStartServices['dataViews'];

interface EsqlContext {
  layers: TextBasedPersistedState['layers'] | undefined;
  http: HttpStart;
  projectRouting?: string;
}

/**
 * The DataView of an ES|QL layer is the one registered for its dataset, so the panel publishes the
 * same DataView, with the filterable fields of the FROM target, as the rest of the ES|QL code.
 * The persisted spec is used when the dataset resolves to another id than the layer's.
 */
const getEsqlDataView = async (
  spec: DataViewSpec,
  esqlQuery: string,
  timeField: string | undefined,
  dataViews: DataViewsService,
  { http, projectRouting }: EsqlContext
) => {
  const source = await EsqlSource.create({
    query: getSourceCommandQueryFromESQLQuery(esqlQuery) || esqlQuery,
    http,
    projectRouting: getProjectRoutingFromEsqlQuery(esqlQuery) ?? projectRouting,
    timeFieldName: timeField ?? spec.timeFieldName,
    resolveTimeField: false,
  });
  const dataView = await getOrRegisterEsqlDataView(dataViews, source, http);
  return dataView.id === spec.id ? dataView : dataViews.create(spec);
};

export async function getUsedDataViews(
  references: LensRuntimeState['attributes']['references'],
  adHocDataViewsSpecs: LensRuntimeState['attributes']['state']['adHocDataViews'],
  dataViews: DataViewsService,
  esql?: EsqlContext
) {
  const esqlLayersByIndex = new Map(
    Object.values(esql?.layers ?? {}).flatMap(({ index, query, timeField }) =>
      index && query && 'esql' in query ? [[index, { query: query.esql, timeField }] as const] : []
    )
  );

  const [{ indexPatterns }, ...adHocDataViews] = await Promise.all([
    getIndexPatternsObjects(
      // get index pattern only references
      references.filter(({ type }) => type === 'index-pattern').map(({ id }) => id),
      dataViews
    ),

    ...Object.values(adHocDataViewsSpecs ?? {}).map((spec) => {
      const esqlLayer = spec.id ? esqlLayersByIndex.get(spec.id) : undefined;
      return esql && esqlLayer
        ? getEsqlDataView(spec, esqlLayer.query, esqlLayer.timeField, dataViews, esql)
        : dataViews.create(spec);
    }),
  ]);

  return uniqBy(indexPatterns.concat(adHocDataViews), 'id');
}
