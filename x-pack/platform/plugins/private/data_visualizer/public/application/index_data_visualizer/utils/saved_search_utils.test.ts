/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filtersNotAlreadyPresent, getEsQueryFromSavedSearch } from './saved_search_utils';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { stubbedSavedObjectIndexPattern } from '@kbn/data-views-plugin/common/data_view.stub';
import { DataView } from '@kbn/data-views-plugin/public';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import type { Query, Filter } from '@kbn/es-query';
import type { FilterMetaParams } from '@kbn/es-query/src/filters/build_filters';
import type { FilterManager } from '@kbn/data-plugin/public';

function createMockFilterManager() {
  const filters: Filter[] = [];
  return {
    getFilters: () => filters,
    addFilters: (value: Filter[]) => {
      filters.push(...value);
    },
  } as unknown as jest.Mocked<FilterManager>;
}
// helper function to create data views
function createMockDataView(id: string) {
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title },
  } = stubbedSavedObjectIndexPattern(id);

  return new DataView({
    spec: {
      id,
      type,
      version,
      timeFieldName,
      fields: JSON.parse(fields),
      title,
      runtimeFieldMap: {},
    },
    fieldFormats: fieldFormatsMock,
    shortDotsEnable: false,
    metaFields: [],
  });
}

const mockDataView = createMockDataView('test-mock-data-view');
const mockUiSettings = uiSettingsServiceMock.createStartContract();

const luceneSavedSearch: SavedSearch = {
  title: 'farequote_filter_and_kuery',
  description: '',
  columns: ['_source'],
  searchSource: createSearchSourceMock({
    index: mockDataView,
    query: { query: 'responsetime > 49', language: 'lucene' } as Query,
    filter: [
      {
        meta: {
          alias: null,
          disabled: false,
          negate: false,
          params: [
            {
              meta: {
                alias: null,
                disabled: false,
                field: 'airline',
                index: 'cb8808e0-9bfb-11ed-bb38-2b1bd55401e7',
                key: 'airline',
                negate: false,
                params: {
                  query: 'ACA',
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  airline: 'ACA',
                },
              },
            },
            {
              meta: {
                alias: null,
                disabled: false,
                field: 'airline',
                index: 'cb8808e0-9bfb-11ed-bb38-2b1bd55401e7',
                key: 'airline',
                negate: false,
                params: {
                  query: 'FFT',
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  airline: 'FFT',
                },
              },
            },
          ] as FilterMetaParams,
          // @ts-expect-error SavedSearch needs to be updated with CombinedFilterMeta
          relation: 'OR',
          type: 'combined',
          index: 'cb8808e0-9bfb-11ed-bb38-2b1bd55401e7',
        },
        query: {},
        $state: {
          store: FilterStateStore.APP_STATE,
        },
      },
    ],
  }),
} as unknown as SavedSearch;

describe('getEsQueryFromSavedSearch()', () => {
  it('return undefined if saved search is not provided', () => {
    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch: undefined,
        uiSettings: mockUiSettings,
      })
    ).toEqual(undefined);
  });
  it('return search data from saved search if neither query nor filter is provided ', () => {
    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch: luceneSavedSearch,
        uiSettings: mockUiSettings,
        filterManager: createMockFilterManager(),
      })
    ).toEqual({
      queryLanguage: 'lucene',
      queryOrAggregateQuery: {
        language: 'lucene',
        query: 'responsetime > 49',
      },
      searchQuery: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [],
                      filter: [{ match_phrase: { airline: 'ACA' } }],
                      should: [],
                      must_not: [],
                    },
                  },
                  {
                    bool: {
                      must: [],
                      filter: [{ match_phrase: { airline: 'FFT' } }],
                      should: [],
                      must_not: [],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must: [{ query_string: { query: 'responsetime > 49' } }],
          must_not: [],
          should: [],
        },
      },
      searchString: 'responsetime > 49',
    });
  });
  it('should override original saved search with the provided query ', () => {
    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch: luceneSavedSearch,
        uiSettings: mockUiSettings,
        query: {
          query: 'responsetime:>100',
          language: 'lucene',
        },
        filterManager: createMockFilterManager(),
      })
    ).toEqual({
      queryLanguage: 'lucene',
      queryOrAggregateQuery: { language: 'lucene', query: 'responsetime:>100' },
      searchQuery: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [],
                      filter: [{ match_phrase: { airline: 'ACA' } }],
                      should: [],
                      must_not: [],
                    },
                  },
                  {
                    bool: {
                      must: [],
                      filter: [{ match_phrase: { airline: 'FFT' } }],
                      should: [],
                      must_not: [],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must: [{ query_string: { query: 'responsetime:>100' } }],
          must_not: [],
          should: [],
        },
      },
      searchString: 'responsetime:>100',
    });
  });

  it('should override original saved search with the provided filters ', () => {
    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch: luceneSavedSearch,
        uiSettings: mockUiSettings,
        query: {
          query: 'responsetime:>100',
          language: 'lucene',
        },
        filters: [
          {
            meta: {
              index: '90a978e0-1c80-11ec-b1d7-f7e5cf21b9e0',
              alias: null,
              negate: true,
              disabled: false,
              type: 'phrase',
              key: 'airline',
              params: {
                query: 'JZA',
              },
            },
            query: {
              match_phrase: {
                airline: 'JZA',
              },
            },
            $state: {
              store: 'appState' as FilterStateStore,
            },
          },
        ],
        filterManager: createMockFilterManager(),
      })
    ).toEqual({
      queryLanguage: 'lucene',
      queryOrAggregateQuery: { language: 'lucene', query: 'responsetime:>100' },
      searchQuery: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [],
                      filter: [{ match_phrase: { airline: 'ACA' } }],
                      should: [],
                      must_not: [],
                    },
                  },
                  {
                    bool: {
                      must: [],
                      filter: [{ match_phrase: { airline: 'FFT' } }],
                      should: [],
                      must_not: [],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must: [{ query_string: { query: 'responsetime:>100' } }],
          must_not: [{ match_phrase: { airline: 'JZA' } }],
          should: [],
        },
      },
      searchString: 'responsetime:>100',
    });
  });

  it('should not throw an exception on receiving malformed input', () => {
    const queryTestFn = () =>
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch: null,
        uiSettings: mockUiSettings,
        query: { query: 'agent.name : "nodejs', language: 'kuery' },
      });

    expect(queryTestFn).not.toThrow();
    expect(queryTestFn()).toBeUndefined();
  });

  it('should apply a negated filter-manager copy of a saved keyed filter without stacking both', () => {
    const phraseFilter = (negate: boolean, disabled = false): Filter => ({
      meta: {
        alias: null,
        disabled,
        negate,
        type: 'phrase',
        key: 'airline',
        params: { query: 'ACA' },
        index: mockDataView.id,
      },
      query: { match_phrase: { airline: 'ACA' } },
      $state: { store: FilterStateStore.APP_STATE },
    });

    const savedSearch: SavedSearch = {
      title: 'keyed_phrase',
      searchSource: createSearchSourceMock({
        index: mockDataView,
        query: { query: '*', language: 'kuery' } as Query,
        filter: [phraseFilter(false)],
      }),
    } as unknown as SavedSearch;

    const filterManager = createMockFilterManager();
    filterManager.addFilters([phraseFilter(true)]);

    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch,
        uiSettings: mockUiSettings,
        filterManager,
      })
    ).toEqual({
      queryLanguage: 'kuery',
      queryOrAggregateQuery: { language: 'kuery', query: '*' },
      searchQuery: {
        bool: {
          filter: [{ query_string: { query: '*' } }],
          must: [],
          must_not: [{ match_phrase: { airline: 'ACA' } }],
          should: [],
        },
      },
      searchString: '*',
    });
  });

  it('should drop a saved keyed filter when the filter-manager copy is disabled', () => {
    const phraseFilter = (disabled: boolean): Filter => ({
      meta: {
        alias: null,
        disabled,
        negate: false,
        type: 'phrase',
        key: 'airline',
        params: { query: 'ACA' },
        index: mockDataView.id,
      },
      query: { match_phrase: { airline: 'ACA' } },
      $state: { store: FilterStateStore.APP_STATE },
    });

    const savedSearch: SavedSearch = {
      title: 'keyed_phrase_disabled',
      searchSource: createSearchSourceMock({
        index: mockDataView,
        query: { query: '*', language: 'kuery' } as Query,
        filter: [phraseFilter(false)],
      }),
    } as unknown as SavedSearch;

    const filterManager = createMockFilterManager();
    filterManager.addFilters([phraseFilter(true)]);

    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch,
        uiSettings: mockUiSettings,
        filterManager,
      })
    ).toEqual({
      queryLanguage: 'kuery',
      queryOrAggregateQuery: { language: 'kuery', query: '*' },
      searchQuery: {
        bool: {
          filter: [{ query_string: { query: '*' } }],
          must: [],
          must_not: [],
          should: [],
        },
      },
      searchString: '*',
    });
  });

  it('should not double a saved keyed filter that was hydrated into the filter manager', () => {
    const phraseFilter: Filter = {
      meta: {
        alias: null,
        disabled: false,
        negate: false,
        type: 'phrase',
        key: 'airline',
        params: { query: 'ACA' },
        index: mockDataView.id,
      },
      query: { match_phrase: { airline: 'ACA' } },
      $state: { store: FilterStateStore.APP_STATE },
    };

    const savedSearch: SavedSearch = {
      title: 'keyed_phrase_hydrated',
      searchSource: createSearchSourceMock({
        index: mockDataView,
        query: { query: '*', language: 'kuery' } as Query,
        filter: [phraseFilter],
      }),
    } as unknown as SavedSearch;

    const filterManager = createMockFilterManager();
    filterManager.addFilters([phraseFilter]);

    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch,
        uiSettings: mockUiSettings,
        filterManager,
      })
    ).toEqual({
      queryLanguage: 'kuery',
      queryOrAggregateQuery: { language: 'kuery', query: '*' },
      searchQuery: {
        bool: {
          filter: [{ query_string: { query: '*' } }, { match_phrase: { airline: 'ACA' } }],
          must: [],
          must_not: [],
          should: [],
        },
      },
      searchString: '*',
    });
  });

  it('should apply a negated filter-manager copy of a saved keyless filter without stacking both', () => {
    const customFilter = (negate: boolean): Filter => ({
      meta: {
        alias: null,
        disabled: false,
        negate,
        type: 'custom',
        index: mockDataView.id,
      },
      query: { match: { message: 'error' } },
      $state: { store: FilterStateStore.APP_STATE },
    });

    const savedSearch: SavedSearch = {
      title: 'keyless_custom',
      searchSource: createSearchSourceMock({
        index: mockDataView,
        query: { query: '*', language: 'kuery' } as Query,
        filter: [customFilter(false)],
      }),
    } as unknown as SavedSearch;

    const filterManager = createMockFilterManager();
    filterManager.addFilters([customFilter(true)]);

    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch,
        uiSettings: mockUiSettings,
        filterManager,
      })
    ).toEqual({
      queryLanguage: 'kuery',
      queryOrAggregateQuery: { language: 'kuery', query: '*' },
      searchQuery: {
        bool: {
          filter: [{ query_string: { query: '*' } }],
          must: [],
          must_not: [{ match: { message: 'error' } }],
          should: [],
        },
      },
      searchString: '*',
    });
  });
});

describe('filtersNotAlreadyPresent()', () => {
  const keyedFilter = (overrides: Partial<Filter['meta']> = {}): Filter => ({
    meta: {
      alias: null,
      disabled: false,
      negate: false,
      type: 'phrase',
      key: 'airline',
      params: { query: 'ACA' },
      index: 'test-index',
      ...overrides,
    },
    query: { match_phrase: { airline: 'ACA' } },
  });

  const keylessFilter = (overrides: Partial<Filter['meta']> = {}): Filter => ({
    meta: {
      alias: null,
      disabled: false,
      negate: false,
      type: 'custom',
      index: 'test-index',
      ...overrides,
    },
    query: { bool: { must: [{ match: { message: 'error' } }] } },
  });

  it('treats keyed filters with the same key/params as duplicates', () => {
    expect(filtersNotAlreadyPresent([keyedFilter()], [keyedFilter()])).toEqual([]);
  });

  it('does not treat a negated keyed filter as a duplicate of the original', () => {
    expect(filtersNotAlreadyPresent([keyedFilter()], [keyedFilter({ negate: true })])).toEqual([
      keyedFilter({ negate: true }),
    ]);
  });

  it('does not treat a disabled keyed filter as a duplicate of the original', () => {
    expect(filtersNotAlreadyPresent([keyedFilter()], [keyedFilter({ disabled: true })])).toEqual([
      keyedFilter({ disabled: true }),
    ]);
  });

  it('treats keyless filters with the same query as duplicates', () => {
    expect(filtersNotAlreadyPresent([keylessFilter()], [keylessFilter()])).toEqual([]);
  });

  it('does not treat a negated keyless filter as a duplicate of the original', () => {
    expect(filtersNotAlreadyPresent([keylessFilter()], [keylessFilter({ negate: true })])).toEqual([
      keylessFilter({ negate: true }),
    ]);
  });

  it('does not treat a disabled keyless filter as a duplicate of the original', () => {
    expect(
      filtersNotAlreadyPresent([keylessFilter()], [keylessFilter({ disabled: true })])
    ).toEqual([keylessFilter({ disabled: true })]);
  });
});
