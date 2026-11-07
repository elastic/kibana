/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { Reference } from '@kbn/content-management-utils';
import type { TextBasedPersistedState } from '@kbn/lens-common';
import { INDEX_PATTERN_TYPE } from '../../common/constants';

type TextBasedLayers = TextBasedPersistedState['layers'];

const getEsqlLayerSpecs = (layers: TextBasedLayers): Record<string, DataViewSpec> => {
  const specs: Record<string, DataViewSpec> = {};

  for (const { index, query, timeField } of Object.values(layers)) {
    if (!index || !query || !isOfAggregateQueryType(query)) {
      continue;
    }
    specs[index] ??= {
      id: index,
      title: getIndexPatternFromESQLQuery(query.esql),
      type: ESQL_TYPE,
      timeFieldName: timeField,
    };
  }

  return specs;
};

/**
 * Adds the ad hoc DataView spec of every ES|QL layer that has none, derived from the layer's own
 * query, index and time field. Persisted specs always win, and a layer that points to a saved
 * data view (a top-level reference) never gets one.
 */
export const withEsqlLayerDataViewSpecs = (
  adHocDataViews: Record<string, DataViewSpec> | undefined,
  layers: TextBasedLayers | undefined,
  references: Reference[] = []
): Record<string, DataViewSpec> => {
  const persisted = adHocDataViews ?? {};
  if (!layers) {
    return persisted;
  }

  const savedDataViewIds = new Set(
    references.filter(({ type }) => type === INDEX_PATTERN_TYPE).map(({ id }) => id)
  );
  const missing = Object.entries(getEsqlLayerSpecs(layers)).filter(
    ([id]) => !persisted[id] && !savedDataViewIds.has(id)
  );

  return missing.length === 0 ? persisted : { ...persisted, ...Object.fromEntries(missing) };
};

/**
 * Drops the ES|QL specs that {@link withEsqlLayerDataViewSpecs} rebuilds from the layers, so they
 * are not persisted twice. `references` are all the data view references about to be persisted:
 * each ES|QL layer contributes one for its index, so a spec is kept when more point to its id
 * (e.g. a reference line layer or an annotation layer using the same ad hoc data view).
 */
export const withoutEsqlLayerDataViewSpecs = (
  adHocDataViews: Record<string, DataViewSpec>,
  layers: TextBasedLayers | undefined,
  references: Reference[]
): Record<string, DataViewSpec> => {
  if (!layers) {
    return adHocDataViews;
  }

  const countById = (ids: Array<string | undefined>) =>
    ids.reduce<Record<string, number>>((acc, id) => {
      if (id) acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {});
  const layerCounts = countById(Object.values(layers).map(({ index }) => index));
  const referenceCounts = countById(
    references.filter(({ type }) => type === INDEX_PATTERN_TYPE).map(({ id }) => id)
  );
  const esqlLayerIds = new Set(Object.keys(getEsqlLayerSpecs(layers)));

  return Object.fromEntries(
    Object.entries(adHocDataViews).filter(
      ([id, spec]) =>
        !(
          spec.type === ESQL_TYPE &&
          esqlLayerIds.has(id) &&
          (referenceCounts[id] ?? 0) <= layerCounts[id]
        )
    )
  );
};
