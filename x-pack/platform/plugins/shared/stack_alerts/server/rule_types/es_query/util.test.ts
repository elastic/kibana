/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnlyEsQueryRuleParams } from './types';
import { Comparator } from '../../../common/comparator_types';
import { getParsedQuery, checkForShardFailures } from './util';

describe('es_query utils', () => {
  const defaultProps = {
    size: 3,
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [],
    thresholdComparator: '>=' as Comparator,
    esQuery: '{ "query": "test-query" }',
    index: ['test-index'],
    timeField: '',
    searchType: 'esQuery',
    excludeHitsFromPreviousRun: true,
    aggType: 'count',
    groupBy: 'all',
    searchConfiguration: {},
    esqlQuery: { esql: 'test-query' },
  };

  describe('getParsedQuery', () => {
    it('should return search params correctly', () => {
      const parsedQuery = getParsedQuery(defaultProps as OnlyEsQueryRuleParams);
      expect(parsedQuery.query).toBe('test-query');
    });

    it('should throw invalid query error', () => {
      expect(() =>
        getParsedQuery({ ...defaultProps, esQuery: '' } as OnlyEsQueryRuleParams)
      ).toThrow('invalid query specified: "" - query must be JSON');
    });

    it('should throw invalid query error due to missing query property', () => {
      expect(() =>
        getParsedQuery({
          ...defaultProps,
          esQuery: '{ "someProperty": "test-query" }',
        } as OnlyEsQueryRuleParams)
      ).toThrow('invalid query specified: "{ "someProperty": "test-query" }" - query must be JSON');
    });
  });

  describe('parseShardFailures', () => {
    it('should return error message if any failures in the shard response', () => {
      expect(
        checkForShardFailures({
          took: 16,
          timed_out: false,
          _shards: {
            total: 51,
            successful: 48,
            skipped: 48,
            failed: 3,
            failures: [
              {
                shard: 0,
                index: 'ccs-index',
                node: '8jMc8jz-Q6qFmKZXfijt-A',
                reason: {
                  type: 'illegal_argument_exception',
                  reason:
                    "Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.",
                },
              },
            ],
          },
          _clusters: { total: 1, successful: 1, running: 0, partial: 0, failed: 0, skipped: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
        })
      ).toEqual(
        `Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.`
      );
    });

    it('should return default error message if malformed error', () => {
      expect(
        checkForShardFailures({
          took: 16,
          timed_out: false,
          _shards: {
            total: 51,
            successful: 48,
            skipped: 48,
            failed: 3,
            failures: [
              // @ts-expect-error
              {
                shard: 0,
                index: 'ccs-index',
                node: '8jMc8jz-Q6qFmKZXfijt-A',
              },
            ],
          },
          _clusters: { total: 1, successful: 1, running: 0, partial: 0, failed: 0, skipped: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
        })
      ).toEqual(`Search returned partial results due to shard failures.`);

      expect(
        checkForShardFailures({
          took: 16,
          timed_out: false,
          _shards: { total: 51, successful: 48, skipped: 48, failed: 3, failures: [] },
          hits: {
            total: {
              value: 0,
              relation: 'eq',
            },
            max_score: 0,
            hits: [],
          },
        })
      ).toEqual(`Search returned partial results due to shard failures.`);
    });

    it('should return error if any skipped clusters with failures', () => {
      expect(
        checkForShardFailures({
          took: 6,
          timed_out: false,
          num_reduce_phases: 0,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          _clusters: {
            total: 1,
            successful: 0,
            skipped: 1,
            running: 0,
            partial: 0,
            failed: 0,
            details: {
              test: {
                status: 'skipped',
                indices: '.kibana-event-log*',
                timed_out: false,
                failures: [
                  {
                    shard: -1,
                    // @ts-expect-error
                    index: null,
                    reason: {
                      type: 'search_phase_execution_exception',
                      reason: 'all shards failed',
                      phase: 'query',
                      grouped: true,
                      failed_shards: [
                        {
                          shard: 0,
                          index: 'test:.ds-.kibana-event-log-ds-2024.07.31-000001',
                          node: 'X1aMu4BpQR-7PHi-bEI8Fw',
                          reason: {
                            type: 'illegal_argument_exception',
                            reason:
                              "Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.",
                          },
                        },
                      ],
                      caused_by: {
                        type: '',
                        reason:
                          "Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.",
                        caused_by: {
                          type: 'illegal_argument_exception',
                          reason:
                            "Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.",
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
        })
      ).toEqual(
        `Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.`
      );
    });

    it('should return default error message if malformed skipped cluster error', () => {
      expect(
        checkForShardFailures({
          took: 6,
          timed_out: false,
          num_reduce_phases: 0,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          _clusters: {
            total: 1,
            successful: 0,
            skipped: 1,
            running: 0,
            partial: 0,
            failed: 0,
            details: {
              test: {
                status: 'skipped',
                indices: '.kibana-event-log*',
                timed_out: false,
                failures: [],
              },
            },
          },
          hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
        })
      ).toEqual(`Search returned partial results due to skipped cluster errors.`);

      expect(
        checkForShardFailures({
          took: 6,
          timed_out: false,
          num_reduce_phases: 0,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          _clusters: {
            total: 1,
            successful: 0,
            skipped: 1,
            running: 0,
            partial: 0,
            failed: 0,
            details: {
              test: {
                status: 'skipped',
                indices: '.kibana-event-log*',
                timed_out: false,
                // @ts-expect-error
                failures: [{ shard: -1 }],
              },
            },
          },
          hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
        })
      ).toEqual(`Search returned partial results due to skipped cluster errors.`);
    });

    it('should return undefined if no failures', () => {
      expect(
        checkForShardFailures({
          took: 16,
          timed_out: false,
          _shards: { total: 51, successful: 51, skipped: 51, failed: 0, failures: [] },
          _clusters: { total: 1, successful: 1, running: 0, partial: 0, failed: 0, skipped: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
        })
      ).toBeUndefined();
    });
  });
});
