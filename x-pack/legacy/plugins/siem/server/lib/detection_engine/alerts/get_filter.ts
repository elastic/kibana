/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromKueryExpression, toElasticsearchQuery, buildEsQuery, Filter } from '@kbn/es-query';

export const getFilter = (
  type: string,
  kql: string | undefined,
  filter: Record<string, {}> | undefined,
  filters: Filter[] | undefined,
  saveId: string | undefined,
  query: string | undefined,
  index: string[]
): unknown => {
  if (type === 'kql' && kql != null) {
    return toElasticsearchQuery(fromKueryExpression(kql), null);
  } else if (type === 'filter' && filter != null) {
    return filter;
  } else if (type === 'query' && filters != null) {
    if (saveId != null) {
      // TODO: Detected a saveId, TODO: Figure out how to call it correctly
      console.log('Detected a saveId, TODO: Figure out how to call it correctly');
    }
    // TODO: Type this
    const indexPattern = {
      fields: [],
      title: index.join(),
    };
    const queries = [query];
    const config = {
      allowLeadingWildcards: true,
      queryStringOptions: { analyze_wildcard: true },
      ignoreFilterIfFieldNotInIndex: false,
      dateFormatTZ: 'Zulu',
    };
    const esQuery = buildEsQuery(
      indexPattern,
      queries,
      filters.filter(f => f.meta.disabled === false),
      config
    );
    console.log('The ES QUery is:', JSON.stringify(esQuery, null, 2));
    return esQuery;
  } else {
    // TODO: Re-visit this error (which should never happen) when we do signal errors for the UI
    throw new TypeError('Invalid State of either type or data structures');
  }
};
