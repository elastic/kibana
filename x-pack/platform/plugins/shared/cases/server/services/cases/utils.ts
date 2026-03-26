/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import { CASE_COMMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import type { FindOptions } from '../../common/types';
import { DEFAULT_PER_PAGE } from '../../routes/api';

export const DEFAULT_CASE_SEARCH_FIELDS = [
  `${CASE_SAVED_OBJECT}.title`,
  `${CASE_SAVED_OBJECT}.description`,
  `${CASE_SAVED_OBJECT}.incremental_id.text`,
];

export const DEFAULT_CASE_NESTED_FIELDS = [
  `${CASE_SAVED_OBJECT}.observables.value`,
  `${CASE_SAVED_OBJECT}.customFields.value`,
];

export const DEFAULT_ATTACHMENT_SEARCH_FIELDS = [
  `${CASE_COMMENT_SAVED_OBJECT}.alertId`,
  `${CASE_COMMENT_SAVED_OBJECT}.eventId`,
  `${CASE_COMMENT_SAVED_OBJECT}.comment`,
];

export const mergeSearchQuery = (
  searchQuery?: estypes.QueryDslQueryContainer,
  filterQuery?: estypes.QueryDslQueryContainer
) => {
  if (!searchQuery && !filterQuery) {
    return undefined;
  }

  if (!searchQuery) {
    return filterQuery;
  }

  if (!filterQuery) {
    return searchQuery;
  }

  // If filterQuery doesn't have bool, wrap both queries in a bool query
  if (!filterQuery.bool) {
    return {
      bool: {
        filter: [searchQuery, filterQuery],
      },
    };
  }

  // Normalize existing filter to an array
  const existingFilter = filterQuery.bool.filter
    ? Array.isArray(filterQuery.bool.filter)
      ? filterQuery.bool.filter
      : [filterQuery.bool.filter]
    : [];

  // Merge searchQuery into the existing bool query's filter array
  return {
    bool: {
      ...filterQuery.bool,
      filter: [searchQuery, ...existingFilter],
    },
  };
};

/**
 * Constructs a search query for cases.
 * When search is provided, it will be used to search for cases in
 *** Default search fields.
 *** Nested fields.
 *** Case IDs.
 * When caseIds is provided, it will be used to filter cases by case IDs.
 */
export const constructSearchQuery = ({
  search,
  searchFields,
  caseIds,
}: {
  search?: string;
  searchFields?: string[];
  caseIds: string[];
}): estypes.QueryDslQueryContainer | undefined => {
  const caseSearchFields = searchFields?.filter((field) =>
    DEFAULT_CASE_SEARCH_FIELDS.includes(field)
  );
  const nestedFields = searchFields?.filter((field) => DEFAULT_CASE_NESTED_FIELDS.includes(field));

  if (!search && !caseIds.length) {
    return undefined;
  }
  const shouldClauses: estypes.QueryDslQueryContainer[] = [];

  if (search) {
    // support search by case ID
    shouldClauses.push({
      term: {
        [`_id`]: `${CASE_SAVED_OBJECT}:${search}`,
      },
    } as estypes.QueryDslQueryContainer);

    if (caseSearchFields?.length) {
      shouldClauses.push({
        multi_match: {
          query: search,
          fields: caseSearchFields,
        },
      } as estypes.QueryDslQueryContainer);
    }

    if (nestedFields?.length) {
      nestedFields.forEach((field) => {
        const path = field.split('.').slice(0, -1).join('.');
        if (searchFields?.includes(field) && path) {
          shouldClauses.push({
            nested: {
              path,
              query: {
                term: { [field]: { value: search, case_insensitive: true } },
              },
            },
          });
        }
      });
    }
  }

  if (caseIds.length > 0) {
    shouldClauses.push({
      terms: {
        [`_id`]: caseIds.map((id) => `${CASE_SAVED_OBJECT}:${id}`),
      },
    });
  }

  return {
    bool: {
      should: shouldClauses,
      minimum_should_match: 1,
    },
  };
};

export const convertFindQueryParams = (
  findOptions: FindOptions
): Omit<estypes.SearchRequest, 'index' | 'type' | 'query' | 'namespaces'> => {
  const { page, perPage, sortField, sortOrder, fields } = findOptions;

  const from = ((page ?? 1) - 1) * (perPage ?? DEFAULT_PER_PAGE);
  const size = perPage ?? DEFAULT_PER_PAGE;
  const sort =
    sortField && sortOrder
      ? {
          [`${CASE_SAVED_OBJECT}.${sortField}`]: {
            order: sortOrder,
          },
        }
      : undefined;

  return {
    from,
    size,
    sort,
    fields,
  };
};
