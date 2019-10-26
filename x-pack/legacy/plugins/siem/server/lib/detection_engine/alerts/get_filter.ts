/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromKueryExpression, toElasticsearchQuery, buildEsQuery } from '@kbn/es-query';
import { Query } from 'src/plugins/data/common/query';
import { AlertServices } from '../../../../../alerting/server/types';
import { SignalAlertParams, PartialFilter } from './types';
import { assertUnreachable } from '../../../utils/build_query';

export const getQueryFilter = (
  query: string,
  language: string,
  filters: PartialFilter[],
  index: string[]
) => {
  console.log('query is:', query);
  console.log('language is:', language);
  console.log('filters are:', JSON.stringify(filters, null, 2));
  const indexPattern = {
    fields: [],
    title: index.join(),
  };
  const queries: Query[] = [{ query, language }];
  const config = {
    allowLeadingWildcards: true,
    queryStringOptions: { analyze_wildcard: true },
    ignoreFilterIfFieldNotInIndex: false,
    dateFormatTZ: 'Zulu',
  };
  const esQuery = buildEsQuery(
    indexPattern,
    queries,
    filters.filter(f => f.meta != null && f.meta.disabled === false),
    config
  );
  console.log('The esQuery is:', JSON.stringify(esQuery, null, 2));
  return esQuery;
};

export const getFilter = async (
  type: SignalAlertParams['type'],
  kql: string | undefined,
  filter: Record<string, {}> | undefined,
  filters: PartialFilter[] | undefined,
  language: string | undefined,
  query: string | undefined,
  savedId: string | undefined,
  services: AlertServices,
  index: string[]
): Promise<unknown> => {
  switch (type) {
    case 'kql': {
      if (kql != null) {
        return toElasticsearchQuery(fromKueryExpression(kql), null);
      } else {
        throw new TypeError('KQL parameter should be defined');
      }
    }
    case 'query': {
      console.log('-----> I am here');
      if (query != null && language != null && index != null) {
        console.log('-----> getting Your Query');
        return getQueryFilter(query, language, filters || [], index);
      } else {
        console.log('-----> throwing errors everywhere');
        throw new TypeError('query, filters, and index parameter should be defined');
      }
    }
    case 'saved_query': {
      if (savedId != null) {
        const savedObject = await services.savedObjectsClient.get('query', savedId);
        return getQueryFilter(
          savedObject.attributes.query.query,
          savedObject.attributes.query.language,
          savedObject.attributes.filters,
          index
        );
      } else {
        throw new TypeError('savedId paramter should be defined');
      }
    }
    case 'filter': {
      return filter;
    }
  }
  return assertUnreachable(type);
};
