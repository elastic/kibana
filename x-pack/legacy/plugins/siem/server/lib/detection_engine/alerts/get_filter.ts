/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildEsQuery } from '@kbn/es-query';
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
  return esQuery;
};

interface GetFilterArgs {
  type: SignalAlertParams['type'];
  filter: Record<string, {}> | undefined | null;
  filters: PartialFilter[] | undefined | null;
  language: string | undefined | null;
  query: string | undefined | null;
  savedId: string | undefined | null;
  services: AlertServices;
  index: string[] | undefined | null;
}

export const getFilter = async ({
  filter,
  filters,
  index,
  language,
  savedId,
  services,
  type,
  query,
}: GetFilterArgs): Promise<unknown> => {
  switch (type) {
    case 'query': {
      if (query != null && language != null && index != null) {
        return getQueryFilter(query, language, filters || [], index);
      } else {
        throw new TypeError('query, filters, and index parameter should be defined');
      }
    }
    case 'saved_query': {
      if (savedId != null && index != null) {
        const savedObject = await services.savedObjectsClient.get('query', savedId);
        return getQueryFilter(
          savedObject.attributes.query.query,
          savedObject.attributes.query.language,
          savedObject.attributes.filters,
          index
        );
      } else {
        throw new TypeError('savedId parameter should be defined');
      }
    }
    case 'filter': {
      return filter;
    }
  }
  return assertUnreachable(type);
};
