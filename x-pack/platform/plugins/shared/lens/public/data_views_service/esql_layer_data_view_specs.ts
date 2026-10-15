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

/**
 * Adds the ad hoc DataView spec of every ES|QL layer that has none, derived from the layer's own
 * query, index and time field. Persisted specs always win, and a layer that points to a saved
 * data view (a top-level reference) never gets one.
 */
export const withEsqlLayerDataViewSpecs = (
  adHocDataViews: Record<string, DataViewSpec> | undefined,
  layers: TextBasedPersistedState['layers'] | undefined,
  references: Reference[] = []
): Record<string, DataViewSpec> => {
  const persisted = adHocDataViews ?? {};
  if (!layers) {
    return persisted;
  }

  const savedDataViewIds = new Set(
    references.filter(({ type }) => type === INDEX_PATTERN_TYPE).map(({ id }) => id)
  );
  const derived: Record<string, DataViewSpec> = {};

  for (const { index, query, timeField } of Object.values(layers)) {
    if (
      !index ||
      persisted[index] ||
      derived[index] ||
      savedDataViewIds.has(index) ||
      !query ||
      !isOfAggregateQueryType(query)
    ) {
      continue;
    }
    derived[index] = {
      id: index,
      title: getIndexPatternFromESQLQuery(query.esql),
      type: ESQL_TYPE,
      timeFieldName: timeField,
    };
  }

  return Object.keys(derived).length === 0 ? persisted : { ...persisted, ...derived };
};
