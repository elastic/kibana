/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type AggregateQuery, type Query, isOfAggregateQueryType } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { ENABLE_ESQL, getESQLQueryVariables } from '@kbn/esql-utils';
import type { LensEmbeddableStartServices } from '../types';

export function isESQLModeEnabled({ uiSettings }: Pick<LensEmbeddableStartServices, 'uiSettings'>) {
  return uiSettings.get(ENABLE_ESQL);
}

export function getEmbeddableVariables(
  query: Query | AggregateQuery,
  esqlVariables: ESQLControlVariable[]
) {
  if (isOfAggregateQueryType(query)) {
    const currentVariables = getESQLQueryVariables(query.esql);
    if (!currentVariables.length) {
      return esqlVariables;
    }
    // filter out the variables that are not used in the query
    return esqlVariables.filter((variable) => currentVariables.includes(variable.key));
  }
}
