/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDescriptionFields } from './get_description_fields';
import { RULE_PREBUILD_DESCRIPTION_FIELDS } from '@kbn/triggers-actions-ui-plugin/public';
import type { EsQueryRuleParams } from './types';
import { SearchType } from './types';
import type { PrebuildFieldsMap, Rule } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { HttpSetup } from '@kbn/core/public';

describe('getDescriptionFields', () => {
  const mockPrebuildFields = {
    [RULE_PREBUILD_DESCRIPTION_FIELDS.INDEX_PATTERN]: jest.fn((val: string[]) => ({
      type: 'index_pattern',
      value: val,
    })),
    [RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY]: jest.fn((val: string) => ({
      type: 'custom_query',
      value: val,
    })),
    [RULE_PREBUILD_DESCRIPTION_FIELDS.ESQL_QUERY]: jest.fn((val: string) => ({
      type: 'esql_query',
      value: val,
    })),
    [RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_ID]: jest.fn((val: string) => ({
      type: 'data_view_id',
      value: val,
    })),
    [RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN]: jest.fn((val: string[]) => ({
      type: 'data_view_index_pattern',
      value: val,
    })),
  } as unknown as PrebuildFieldsMap;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('guard clauses', () => {
    it('returns empty array when rule is not provided', () => {
      const result = getDescriptionFields({
        // @ts-expect-error: rule should be defined
        rule: undefined,
        prebuildFields: mockPrebuildFields,
        http: undefined,
      });

      expect(result).toEqual([]);
    });

    it('returns empty array when prebuildFields is not provided', () => {
      const result = getDescriptionFields({
        rule: {
          params: {
            searchType: 'esQuery',
            index: ['logs-*'],
            esQuery: '{"query": {"match_all": {}}}',
          } as unknown as EsQueryRuleParams,
        } as unknown as Rule<EsQueryRuleParams>,
        prebuildFields: undefined,
        http: undefined,
      });

      expect(result).toEqual([]);
    });
  });

  describe('esQuery search type', () => {
    it('returns index pattern and custom query fields', () => {
      const params: EsQueryRuleParams<SearchType.esQuery> = {
        searchType: SearchType.esQuery,
        index: ['logs-*', 'metrics-*'],
        esQuery: '{"query": {"match_all": {}}}',
        timeField: '@timestamp',
        size: 100,
        threshold: [0],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        aggType: 'count',
        groupBy: 'all',
        excludeHitsFromPreviousRun: true,
      };

      const result = getDescriptionFields({
        rule: { params } as unknown as Rule<EsQueryRuleParams>,
        prebuildFields: mockPrebuildFields,
        http: {} as HttpSetup,
      });

      expect(result).toHaveLength(2);
      expect(
        mockPrebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.INDEX_PATTERN]
      ).toHaveBeenCalledWith(params.index);
      expect(
        mockPrebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY]
      ).toHaveBeenCalledWith(params.esQuery);
      expect(result[0]).toEqual({ type: 'index_pattern', value: params.index });
      expect(result[1]).toEqual({ type: 'custom_query', value: params.esQuery });
    });
  });

  describe('esqlQuery search type', () => {
    it('returns esql query field', () => {
      const esqlQueryString = 'FROM logs-* | WHERE status = "error"';
      const params: EsQueryRuleParams<SearchType.esqlQuery> = {
        searchType: SearchType.esqlQuery,
        esqlQuery: { esql: esqlQueryString },
        timeField: '@timestamp',
        size: 100,
        threshold: [0],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        aggType: 'count',
        groupBy: 'all',
        excludeHitsFromPreviousRun: true,
      };

      const result = getDescriptionFields({
        rule: { params } as unknown as Rule<EsQueryRuleParams>,
        prebuildFields: mockPrebuildFields,
        http: {} as HttpSetup,
      });

      expect(result).toHaveLength(1);
      expect(mockPrebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.ESQL_QUERY]).toHaveBeenCalledWith(
        esqlQueryString
      );
      expect(result[0]).toEqual({ type: 'esql_query', value: esqlQueryString });
    });
  });

  describe('searchSource search type', () => {
    it('returns data view index pattern and custom query when both are present', () => {
      const params: EsQueryRuleParams<SearchType.searchSource> = {
        searchType: SearchType.searchSource,
        searchConfiguration: {
          index: 'my-data-view-id',
          query: {
            query: 'error AND status:500',
            language: 'kuery',
          },
        },
        size: 100,
        threshold: [0],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        aggType: 'count',
        groupBy: 'all',
        excludeHitsFromPreviousRun: true,
      };

      const result = getDescriptionFields({
        rule: { params } as unknown as Rule<EsQueryRuleParams>,
        prebuildFields: mockPrebuildFields,
        http: {} as HttpSetup,
      });

      expect(result).toHaveLength(2);
      expect(
        mockPrebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN]
      ).toHaveBeenCalledWith('my-data-view-id');
      expect(
        mockPrebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY]
      ).toHaveBeenCalledWith('error AND status:500');
      expect(result[0]).toEqual({ type: 'data_view_index_pattern', value: 'my-data-view-id' });
      expect(result[1]).toEqual({ type: 'custom_query', value: 'error AND status:500' });
    });

    it('returns only data view index pattern when query is not present', () => {
      const params: EsQueryRuleParams<SearchType.searchSource> = {
        searchType: SearchType.searchSource,
        searchConfiguration: {
          index: 'my-data-view-id',
        },
        size: 100,
        threshold: [0],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        aggType: 'count',
        groupBy: 'all',
        excludeHitsFromPreviousRun: true,
      };

      const result = getDescriptionFields({
        rule: { params } as unknown as Rule<EsQueryRuleParams>,
        prebuildFields: mockPrebuildFields,
        http: {} as HttpSetup,
      });

      expect(result).toHaveLength(1);
      expect(
        mockPrebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN]
      ).toHaveBeenCalledWith('my-data-view-id');
      expect(
        mockPrebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY]
      ).not.toHaveBeenCalled();
    });

    it('returns only custom query when index is not a string', () => {
      const params: EsQueryRuleParams<SearchType.searchSource> = {
        searchType: SearchType.searchSource,
        searchConfiguration: {
          // @ts-expect-error: index should be string
          index: ['array-index'],
          query: {
            query: 'error',
            language: 'kuery',
          },
        },
        size: 100,
        threshold: [0],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        aggType: 'count',
        groupBy: 'all',
        excludeHitsFromPreviousRun: true,
      };

      const result = getDescriptionFields({
        rule: { params } as unknown as Rule<EsQueryRuleParams>,
        prebuildFields: mockPrebuildFields,
        http: {} as HttpSetup,
      });

      expect(result).toHaveLength(1);
      expect(
        mockPrebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN]
      ).not.toHaveBeenCalled();
      expect(
        mockPrebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY]
      ).toHaveBeenCalledWith('error');
    });

    it('returns empty array when searchConfiguration is not provided', () => {
      const params: EsQueryRuleParams<SearchType.searchSource> = {
        searchType: SearchType.searchSource,
        size: 100,
        threshold: [0],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        aggType: 'count',
        groupBy: 'all',
        excludeHitsFromPreviousRun: true,
      };

      const result = getDescriptionFields({
        rule: { params } as unknown as Rule<EsQueryRuleParams>,
        prebuildFields: mockPrebuildFields,
        http: {} as HttpSetup,
      });

      expect(result).toEqual([]);
    });

    it('returns empty array when query is not of query type', () => {
      const params: EsQueryRuleParams<SearchType.searchSource> = {
        searchType: SearchType.searchSource,
        searchConfiguration: {
          index: 'my-data-view-id',
          // @ts-expect-error: query should be of query type
          query: { someOtherType: 'value' },
        },
        size: 100,
        threshold: [0],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        aggType: 'count',
        groupBy: 'all',
        excludeHitsFromPreviousRun: true,
      };

      const result = getDescriptionFields({
        rule: { params } as unknown as Rule<EsQueryRuleParams>,
        prebuildFields: mockPrebuildFields,
        http: {} as HttpSetup,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'data_view_index_pattern', value: 'my-data-view-id' });
      expect(
        mockPrebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY]
      ).not.toHaveBeenCalled();
    });

    it('returns empty array when query.query is not a string', () => {
      const params: EsQueryRuleParams<SearchType.searchSource> = {
        searchType: SearchType.searchSource,
        searchConfiguration: {
          index: 'my-data-view-id',
          query: {
            query: { bool: { must: [] } },
            language: 'kuery',
          },
        },
        size: 100,
        threshold: [0],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        aggType: 'count',
        groupBy: 'all',
        excludeHitsFromPreviousRun: true,
      };

      const result = getDescriptionFields({
        rule: { params } as unknown as Rule<EsQueryRuleParams>,
        prebuildFields: mockPrebuildFields,
        http: {} as HttpSetup,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'data_view_index_pattern', value: 'my-data-view-id' });
      expect(
        mockPrebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY]
      ).not.toHaveBeenCalled();
    });
  });
});
