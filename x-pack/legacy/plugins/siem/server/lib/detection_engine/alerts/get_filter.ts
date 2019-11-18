/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertServices } from '../../../../../alerting/server/types';
import { SignalAlertParams, PartialFilter } from './types';
import { assertUnreachable } from '../../../utils/build_query';
import {
  Query,
  esQuery,
  esFilters,
  IIndexPattern,
} from '../../../../../../../../src/plugins/data/server';

export const getQueryFilter = (
  query: string,
  language: string,
  filters: PartialFilter[],
  index: string[]
) => {
  const indexPattern = {
    fields: [],
    title: index.join(),
  } as IIndexPattern;

  const queries: Query[] = [{ query, language }];
  const config = {
    allowLeadingWildcards: true,
    queryStringOptions: { analyze_wildcard: true },
    ignoreFilterIfFieldNotInIndex: false,
    dateFormatTZ: 'Zulu',
  };

  const enabledFilters = ((filters as unknown) as esFilters.Filter[]).filter(
    f => f && !esFilters.isFilterDisabled(f)
  );

  return esQuery.buildEsQuery(indexPattern, queries, enabledFilters, config);
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
