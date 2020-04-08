/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { assertUnreachable } from '../../../utils/build_query';
import {
  Filter,
  Query,
  esQuery,
  esFilters,
  IIndexPattern,
} from '../../../../../../../../src/plugins/data/server';
import { PartialFilter, RuleAlertParams } from '../types';
import { BadRequestError } from '../errors/bad_request_error';

export const evaluateValues = listItem => {
  const queryBuilder = [];
  if (listItem.values_operator === 'excluded') {
    queryBuilder.push(`not ${listItem.field}: `);
  } else {
    queryBuilder.push(`${listItem.field}: `);
  }

  switch (listItem.values_type) {
    case 'exists':
      queryBuilder.push('*');
      break;
    case 'match':
      queryBuilder.push(listItem.values[0].name);
      break;
    case 'match_all':
      const length = listItem.values?.length;
      // eslint-disable-next-line no-unused-expressions
      listItem.values?.forEach((element, index) => {
        if (index !== length - 1) {
          queryBuilder.push(index === 0 ? `(${element.name} or ` : `${element.name} or `);
        } else {
          queryBuilder.push(`${element.name})`);
        }
      });
      break;
    default:
      break;
  }

  return queryBuilder.join('');
};

export const buildQueryExceptions = (
  query: string,
  language: string,
  lists: RuleAlertParams['lists']
): Query[] => {
  if (!isEmpty(lists)) {
    const queries: query[] = lists?.reduce((acc, listItem, i) => {
      const queryBuilder = ['('];

      queryBuilder.push(evaluateValues(listItem));

      if (listItem.and) {
        listItem.and.forEach(item => {
          queryBuilder.push(`and ${evaluateValues(item)}`);
        });
      }

      queryBuilder.push(')');

      if (lists.length > 1 && i !== lists.length - 1) {
        queryBuilder.push(' or ');
        return `${acc}${queryBuilder.join('')}`;
      }

      return `${acc}${queryBuilder.join('')}`;
    }, `${query} and not `);

    return [{ query: queries, language }];
  } else {
    return [{ query, language }];
  }
};

export const getQueryFilter = (
  query: string,
  language: string,
  filters: PartialFilter[],
  index: string[],
  lists: RuleAlertParams['lists']
) => {
  const indexPattern = {
    fields: [],
    title: index.join(),
  } as IIndexPattern;

  const queries: Query[] = buildQueryExceptions(query, language, lists);
  const config = {
    allowLeadingWildcards: true,
    queryStringOptions: { analyze_wildcard: true },
    ignoreFilterIfFieldNotInIndex: false,
    dateFormatTZ: 'Zulu',
  };

  const enabledFilters = ((filters as unknown) as Filter[]).filter(
    f => f && !esFilters.isFilterDisabled(f)
  );

  const a = esQuery.buildEsQuery(indexPattern, queries, enabledFilters, config);
  return a;
};

interface GetFilterArgs {
  type: RuleAlertParams['type'];
  filters: PartialFilter[] | undefined | null;
  language: string | undefined | null;
  query: string | undefined | null;
  savedId: string | undefined | null;
  services: AlertServices;
  index: string[] | undefined | null;
  lists: RuleAlertParams['lists'];
}

interface QueryAttributes {
  // NOTE: doesn't match Query interface
  query: {
    query: string;
    language: string;
  };
  filters: PartialFilter[];
}

export const getFilter = async ({
  filters,
  index,
  language,
  savedId,
  services,
  type,
  query,
  lists,
}: GetFilterArgs): Promise<unknown> => {
  switch (type) {
    case 'query': {
      if (query != null && language != null && index != null) {
        return getQueryFilter(query, language, filters || [], index, lists);
      } else {
        throw new BadRequestError('query, filters, and index parameter should be defined');
      }
    }
    case 'saved_query': {
      if (savedId != null && index != null) {
        try {
          // try to get the saved object first
          const savedObject = await services.savedObjectsClient.get<QueryAttributes>(
            'query',
            savedId
          );
          return getQueryFilter(
            savedObject.attributes.query.query,
            savedObject.attributes.query.language,
            savedObject.attributes.filters,
            index,
            lists
          );
        } catch (err) {
          // saved object does not exist, so try and fall back if the user pushed
          // any additional language, query, filters, etc...
          if (query != null && language != null && index != null) {
            return getQueryFilter(query, language, filters || [], index, lists);
          } else {
            // user did not give any additional fall back mechanism for generating a rule
            // rethrow error for activity monitoring
            throw err;
          }
        }
      } else {
        throw new BadRequestError('savedId parameter should be defined');
      }
    }
    case 'machine_learning': {
      throw new BadRequestError(
        'Unsupported Rule of type "machine_learning" supplied to getFilter'
      );
    }
  }
  return assertUnreachable(type);
};
