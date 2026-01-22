/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import {
  constructSearchQuery,
  convertFindQueryParams,
  DEFAULT_CASE_NESTED_FIELDS,
  DEFAULT_CASE_SEARCH_FIELDS,
  mergeSearchQuery,
} from './utils';
import { DEFAULT_PER_PAGE } from '../../routes/api';

const filterQuery: estypes.QueryDslQueryContainer = {
  bool: {
    must: [{ term: { 'cases.status': 'open' } }],
  },
};
const searchQuery: estypes.QueryDslQueryContainer = {
  bool: {
    should: [{ term: { field: 'value' } }],
    minimum_should_match: 1,
  },
};

describe('mergeSearchQuery', () => {
  it('returns undefined when either or both searchQuery and filterQuery are undefined', () => {
    expect(mergeSearchQuery(undefined, undefined)).toBeUndefined();
    expect(mergeSearchQuery(undefined, filterQuery)).toEqual(filterQuery);
    expect(mergeSearchQuery(searchQuery, undefined)).toEqual(searchQuery);
  });

  it('should merges searchQuery and filterQuery correctly', () => {
    const result = mergeSearchQuery(searchQuery, filterQuery);
    expect(result).toEqual({
      bool: {
        must: [{ term: { 'cases.status': 'open' } }],
        filter: [searchQuery],
      },
    });
  });
  it('merges searchQuery with query that does not have bool', () => {
    const simpleSearchQuery: estypes.QueryDslQueryContainer = {
      term: { searchField: 'searchValue' },
    };
    const query: estypes.QueryDslQueryContainer = {
      term: { field: 'value' },
    };
    const result = mergeSearchQuery(simpleSearchQuery, query);

    expect(result).toEqual({
      bool: {
        filter: [simpleSearchQuery, query],
      },
    });
  });

  it('merges searchQuery with query that has existing filter array', () => {
    const result = mergeSearchQuery(searchQuery, {
      ...filterQuery,
      bool: {
        must: [{ term: { 'cases.status': 'open' } }],
        filter: [{ term: { existingField: 'existingValue' } }],
      },
    });

    expect(result).toEqual({
      bool: {
        must: [{ term: { 'cases.status': 'open' } }],
        filter: [searchQuery, { term: { existingField: 'existingValue' } }],
      },
    });
  });

  it('merges searchQuery with query that has existing filter as single object', () => {
    const simpleSearchQuery: estypes.QueryDslQueryContainer = {
      term: { searchField: 'searchValue' },
    };
    const existingFilter: estypes.QueryDslQueryContainer = {
      term: { existingField: 'existingValue' },
    };
    const query: estypes.QueryDslQueryContainer = {
      bool: {
        must: [{ term: { field: 'value' } }],
        filter: existingFilter,
      },
    };

    const result = mergeSearchQuery(simpleSearchQuery, query);

    expect(result).toEqual({
      bool: {
        must: [{ term: { field: 'value' } }],
        filter: [simpleSearchQuery, existingFilter],
      },
    });
  });

  it('merges searchQuery with query that has bool but no filter', () => {
    const simpleSearchQuery: estypes.QueryDslQueryContainer = {
      term: { searchField: 'searchValue' },
    };
    const query: estypes.QueryDslQueryContainer = {
      bool: {
        must: [{ term: { field: 'value' } }],
      },
    };

    const result = mergeSearchQuery(simpleSearchQuery, query);

    expect(result).toEqual({
      bool: {
        must: [{ term: { field: 'value' } }],
        filter: [simpleSearchQuery],
      },
    });
  });

  it('preserves other bool properties when merging', () => {
    const simpleSearchQuery: estypes.QueryDslQueryContainer = {
      term: { searchField: 'searchValue' },
    };
    const query: estypes.QueryDslQueryContainer = {
      bool: {
        must: [{ term: { field1: 'value1' } }],
        must_not: [{ term: { field2: 'value2' } }],
        should: [{ term: { field3: 'value3' } }],
        filter: [{ term: { field4: 'value4' } }],
      },
    };

    const result = mergeSearchQuery(simpleSearchQuery, query);

    expect(result).toEqual({
      bool: {
        must: [{ term: { field1: 'value1' } }],
        must_not: [{ term: { field2: 'value2' } }],
        should: [{ term: { field3: 'value3' } }],
        filter: [simpleSearchQuery, { term: { field4: 'value4' } }],
      },
    });
  });

  it('merges searchQuery with bool when filterQuery has bool with empty filter array', () => {
    const simpleSearchQuery: estypes.QueryDslQueryContainer = {
      term: { searchField: 'searchValue' },
    };
    const query: estypes.QueryDslQueryContainer = {
      bool: {
        must: [{ term: { field: 'value' } }],
        filter: [],
      },
    };

    const result = mergeSearchQuery(simpleSearchQuery, query);

    expect(result).toEqual({
      bool: {
        must: [{ term: { field: 'value' } }],
        filter: [simpleSearchQuery],
      },
    });
  });

  it('merges searchQuery with bool when filterQuery does not have bool', () => {
    const boolSearchQuery: estypes.QueryDslQueryContainer = {
      bool: {
        should: [{ term: { field: 'value' } }],
        minimum_should_match: 1,
      },
    };
    const query: estypes.QueryDslQueryContainer = {
      term: { field: 'value' },
    };

    const result = mergeSearchQuery(boolSearchQuery, query);

    expect(result).toEqual({
      bool: {
        filter: [boolSearchQuery, query],
      },
    });
  });

  it('handles searchQuery with bool containing filter when merging with filterQuery', () => {
    const complexSearchQuery: estypes.QueryDslQueryContainer = {
      bool: {
        filter: [{ term: { searchField: 'searchValue' } }],
        should: [{ term: { field: 'value' } }],
      },
    };
    const query: estypes.QueryDslQueryContainer = {
      bool: {
        must: [{ term: { field: 'value' } }],
      },
    };

    const result = mergeSearchQuery(complexSearchQuery, query);

    expect(result).toEqual({
      bool: {
        must: [{ term: { field: 'value' } }],
        filter: [complexSearchQuery],
      },
    });
  });
});

const search = 'test search';
const searchFieldQuery: estypes.QueryDslQueryContainer[] = [
  {
    term: {
      _id: `${CASE_SAVED_OBJECT}:${search}`,
    },
  },
  {
    multi_match: {
      query: search,
      fields: DEFAULT_CASE_SEARCH_FIELDS,
    },
  },
  {
    nested: {
      path: 'cases.observables',
      query: {
        term: { 'cases.observables.value': { value: search, case_insensitive: true } },
      },
    },
  },
  {
    nested: {
      path: 'cases.customFields',
      query: {
        term: { 'cases.customFields.value': { value: search, case_insensitive: true } },
      },
    },
  },
];
const caseIdQuery: estypes.QueryDslQueryContainer = {
  terms: {
    _id: ['case-1', 'case-2'].map((id) => `${CASE_SAVED_OBJECT}:${id}`),
  },
};

const expectedResult: estypes.QueryDslQueryContainer = {
  bool: {
    should: [...searchFieldQuery, caseIdQuery],
    minimum_should_match: 1,
  },
};

describe('constructSearchQuery', () => {
  it('returns undefined when search is undefined and caseIds is empty', () => {
    expect(constructSearchQuery({ search: undefined, caseIds: [] })).toBeUndefined();
  });

  it('returns undefined when search is empty string and caseIds is empty', () => {
    expect(constructSearchQuery({ search: '', caseIds: [] })).toBeUndefined();
  });

  it('should construct query with search and valid searchFields', () => {
    const result = constructSearchQuery({
      search,
      searchFields: DEFAULT_CASE_SEARCH_FIELDS,
      caseIds: [],
    });

    expect(result).toEqual({
      bool: {
        should: searchFieldQuery.slice(0, 2), // id and multi_match
        minimum_should_match: 1,
      },
    });
  });

  it('should construct query with nested fields', () => {
    const result = constructSearchQuery({
      search,
      searchFields: [...DEFAULT_CASE_SEARCH_FIELDS, ...DEFAULT_CASE_NESTED_FIELDS],
      caseIds: [],
    });
    expect(result).toEqual({
      bool: {
        should: searchFieldQuery,
        minimum_should_match: 1,
      },
    });
  });

  it('should exclude invalid fields', () => {
    const result = constructSearchQuery({
      search,
      searchFields: [...DEFAULT_CASE_SEARCH_FIELDS, ...DEFAULT_CASE_NESTED_FIELDS, 'invalid.field'],
      caseIds: [],
    });

    expect(result).toEqual({
      bool: {
        should: searchFieldQuery,
        minimum_should_match: 1,
      },
    });
  });

  it('should construct query with only caseIds', () => {
    const caseIds = ['case-1', 'case-2'];
    const result = constructSearchQuery({ search: undefined, caseIds });

    expect(result).toEqual({
      bool: {
        should: [caseIdQuery],
        minimum_should_match: 1,
      },
    });
  });

  it('should construct query correctly', () => {
    const result = constructSearchQuery({
      search,
      searchFields: [...DEFAULT_CASE_SEARCH_FIELDS, ...DEFAULT_CASE_NESTED_FIELDS],
      caseIds: ['case-1', 'case-2'],
    });
    expect(result).toEqual(expectedResult);
  });
});

describe('convertFindQueryParams', () => {
  it('should convert find options correctly', () => {
    const findOptions = {
      page: 2,
      perPage: 10,
      sortField: 'createdAt',
      sortOrder: 'desc' as const,
      fields: ['field1', 'field2'],
    };

    const result = convertFindQueryParams(findOptions);

    expect(result).toEqual({
      from: 10,
      size: 10,
      sort: {
        [`${CASE_SAVED_OBJECT}.createdAt`]: {
          order: 'desc',
        },
      },
      fields: ['field1', 'field2'],
    });
  });

  it('should calculate from correctly for different page numbers', () => {
    const testCases = [
      { page: 1, perPage: 10, expectedFrom: 0 },
      { page: 2, perPage: 10, expectedFrom: 10 },
      { page: 3, perPage: 10, expectedFrom: 20 },
      { page: 5, perPage: 25, expectedFrom: 100 },
    ];

    testCases.forEach(({ page, perPage, expectedFrom }) => {
      const findOptions = { page, perPage };
      const result = convertFindQueryParams(findOptions);
      expect(result.from).toBe(expectedFrom);
      expect(result.size).toBe(perPage);
    });
  });

  it('should process sortField and sortOrder correctly', () => {
    const findOptions = {
      page: 1,
      perPage: 10,
      sortField: 'status',
      sortOrder: 'asc' as const,
    };

    const result = convertFindQueryParams(findOptions);

    expect(result.sort).toEqual({
      [`${CASE_SAVED_OBJECT}.status`]: {
        order: 'asc',
      },
    });
  });

  it('should handle empty findOptions object', () => {
    const findOptions = {};

    const result = convertFindQueryParams(findOptions);

    expect(result).toEqual({
      from: 0,
      size: DEFAULT_PER_PAGE,
      sort: undefined,
      fields: undefined,
    });
  });
});
