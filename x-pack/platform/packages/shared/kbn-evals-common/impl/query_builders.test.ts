/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildRunFilterQuery,
  buildStatsAggregation,
  parseStatsAggregationResponse,
  SCORES_SORT_ORDER,
  buildRunsListingFilterQuery,
  buildRunsListingAggregation,
  parseRunsListingResponse,
  buildModelDisplayId,
} from './query_builders';

describe('query_builders', () => {
  describe('buildRunFilterQuery', () => {
    it('filters by run_id only when no options provided', () => {
      const query = buildRunFilterQuery('run-123');
      expect(query).toEqual({
        bool: { must: [{ term: { run_id: 'run-123' } }] },
      });
    });

    it('adds suite filter when suiteId is provided', () => {
      const query = buildRunFilterQuery('run-123', { suiteId: 'suite-a' });
      expect(query.bool.must).toHaveLength(2);
      expect(query.bool.must[1]).toEqual({ term: { 'suite.id': 'suite-a' } });
    });

    it('adds model filter when modelId is provided', () => {
      const query = buildRunFilterQuery('run-123', { modelId: 'gpt-4' });
      expect(query.bool.must).toHaveLength(2);
      expect(query.bool.must[1]).toEqual({ term: { 'task.model.id': 'gpt-4' } });
    });

    it('adds both filters when both options are provided', () => {
      const query = buildRunFilterQuery('run-123', { suiteId: 'suite-a', modelId: 'gpt-4' });
      expect(query.bool.must).toHaveLength(3);
    });

    it('ignores empty string options', () => {
      const query = buildRunFilterQuery('run-123', { suiteId: '', modelId: '' });
      expect(query.bool.must).toHaveLength(1);
    });
  });

  describe('buildStatsAggregation', () => {
    it('returns the expected aggregation structure', () => {
      const agg = buildStatsAggregation();
      expect(agg.by_dataset.terms.field).toBe('example.dataset.id');
      expect(agg.by_dataset.aggs.by_evaluator.terms.field).toBe('evaluator.name');
      expect(agg.by_dataset.aggs.by_evaluator.aggs.score_stats).toEqual({
        extended_stats: { field: 'evaluator.score' },
      });
      expect(agg.by_dataset.aggs.by_evaluator.aggs.score_median).toEqual({
        percentiles: { field: 'evaluator.score', percents: [50] },
      });
    });
  });

  describe('SCORES_SORT_ORDER', () => {
    it('sorts by dataset, example, evaluator, then repetition', () => {
      expect(SCORES_SORT_ORDER).toEqual([
        { 'example.dataset.name': { order: 'asc' } },
        { 'example.index': { order: 'asc' } },
        { 'evaluator.name': { order: 'asc' } },
        { 'task.repetition_index': { order: 'asc' } },
      ]);
    });
  });

  describe('buildRunsListingFilterQuery', () => {
    it('returns match_all when no filters provided', () => {
      expect(buildRunsListingFilterQuery()).toEqual({ match_all: {} });
    });

    it('returns match_all for empty options', () => {
      expect(buildRunsListingFilterQuery({})).toEqual({ match_all: {} });
    });

    it('filters by suiteId', () => {
      const query = buildRunsListingFilterQuery({ suiteId: 'suite-a' });
      expect(query).toEqual({
        bool: { filter: [{ term: { 'suite.id': 'suite-a' } }] },
      });
    });

    it('filters by modelId', () => {
      const query = buildRunsListingFilterQuery({ modelId: 'gpt-4' });
      expect(query).toEqual({
        bool: { filter: [{ term: { 'task.model.id': 'gpt-4' } }] },
      });
    });

    it('filters by branch', () => {
      const query = buildRunsListingFilterQuery({ branch: 'main' });
      expect(query).toEqual({
        bool: { filter: [{ term: { 'run_metadata.git_branch': 'main' } }] },
      });
    });

    it('combines all filters when all options are provided', () => {
      const query = buildRunsListingFilterQuery({
        suiteId: 'suite-a',
        modelId: 'gpt-4',
        branch: 'main',
      }) as { bool: { filter: unknown[] } };
      expect(query.bool.filter).toHaveLength(3);
    });
  });

  describe('buildRunsListingAggregation', () => {
    it('sets terms size to page * perPage', () => {
      const agg = buildRunsListingAggregation({ page: 3, perPage: 25 });
      expect(agg.runs.terms.size).toBe(75);
    });

    it('includes cardinality aggregation for total_runs', () => {
      const agg = buildRunsListingAggregation({ page: 1, perPage: 10 });
      expect(agg.total_runs).toEqual({ cardinality: { field: 'run_id' } });
    });

    it('sorts by latest_timestamp descending', () => {
      const agg = buildRunsListingAggregation({ page: 1, perPage: 10 });
      expect(agg.runs.terms.order).toEqual({ latest_timestamp: 'desc' });
    });

    it('includes all expected sub-aggregations', () => {
      const agg = buildRunsListingAggregation({ page: 1, perPage: 10 });
      const subAggs = Object.keys(agg.runs.aggs);
      expect(subAggs).toEqual(
        expect.arrayContaining([
          'latest_timestamp',
          'suite_id',
          'task_model_id',
          'task_model_family',
          'task_model_provider',
          'evaluator_model_id',
          'evaluator_model_family',
          'evaluator_model_provider',
          'git_branch',
          'git_commit_sha',
          'total_repetitions',
          'build_url',
        ])
      );
    });
  });

  describe('parseRunsListingResponse', () => {
    const makeBucket = (overrides: Partial<Record<string, unknown>> = {}) => ({
      key: 'run-1',
      doc_count: 10,
      latest_timestamp: { value_as_string: '2025-01-01T00:00:00Z' },
      suite_id: { buckets: [{ key: 'suite-a' }] },
      task_model_id: { buckets: [{ key: 'gpt-4' }] },
      task_model_family: { buckets: [{ key: 'gpt-4' }] },
      task_model_provider: { buckets: [{ key: 'openai' }] },
      evaluator_model_id: { buckets: [{ key: 'claude-3' }] },
      evaluator_model_family: { buckets: [{ key: 'claude-3' }] },
      evaluator_model_provider: { buckets: [{ key: 'anthropic' }] },
      git_branch: { buckets: [{ key: 'main' }] },
      git_commit_sha: { buckets: [{ key: 'abc123' }] },
      total_repetitions: { value: 3 },
      build_url: { buckets: [{ key: 'https://buildkite.com/build/1' }] },
      ...overrides,
    });

    it('returns empty runs and zero total for undefined aggregations', () => {
      const result = parseRunsListingResponse(undefined, { page: 1, perPage: 25 });
      expect(result).toEqual({ runs: [], total: 0 });
    });

    it('returns empty runs for empty buckets', () => {
      const result = parseRunsListingResponse(
        { total_runs: { value: 0 }, runs: { buckets: [] } },
        { page: 1, perPage: 25 }
      );
      expect(result).toEqual({ runs: [], total: 0 });
    });

    it('parses a single bucket correctly', () => {
      const aggs = {
        total_runs: { value: 1 },
        runs: { buckets: [makeBucket()] },
      };
      const result = parseRunsListingResponse(aggs, { page: 1, perPage: 25 });

      expect(result.total).toBe(1);
      expect(result.runs).toHaveLength(1);
      expect(result.runs[0]).toEqual({
        run_id: 'run-1',
        timestamp: '2025-01-01T00:00:00Z',
        suite_id: 'suite-a',
        task_model: { id: 'gpt-4', family: 'gpt-4', provider: 'openai' },
        evaluator_model: { id: 'claude-3', family: 'claude-3', provider: 'anthropic' },
        git_branch: 'main',
        git_commit_sha: 'abc123',
        total_repetitions: 3,
        ci: { build_url: 'https://buildkite.com/build/1' },
      });
    });

    it('slices to the correct page window', () => {
      const buckets = Array.from({ length: 5 }, (_, i) =>
        makeBucket({ key: `run-${i}`, doc_count: i + 1 })
      );
      const aggs = { total_runs: { value: 5 }, runs: { buckets } };

      const page1 = parseRunsListingResponse(aggs, { page: 1, perPage: 2 });
      expect(page1.runs.map((r) => r.run_id)).toEqual(['run-0', 'run-1']);

      const page2 = parseRunsListingResponse(aggs, { page: 2, perPage: 2 });
      expect(page2.runs.map((r) => r.run_id)).toEqual(['run-2', 'run-3']);

      const page3 = parseRunsListingResponse(aggs, { page: 3, perPage: 2 });
      expect(page3.runs.map((r) => r.run_id)).toEqual(['run-4']);
    });

    it('returns empty runs for a page beyond results', () => {
      const aggs = {
        total_runs: { value: 1 },
        runs: { buckets: [makeBucket()] },
      };
      const result = parseRunsListingResponse(aggs, { page: 5, perPage: 25 });
      expect(result.runs).toHaveLength(0);
      expect(result.total).toBe(1);
    });

    it('falls back to null for missing git metadata', () => {
      const bucket = makeBucket({
        git_branch: { buckets: [] },
        git_commit_sha: undefined,
      });
      const aggs = { total_runs: { value: 1 }, runs: { buckets: [bucket] } };
      const result = parseRunsListingResponse(aggs, { page: 1, perPage: 25 });
      expect(result.runs[0].git_branch).toBeNull();
      expect(result.runs[0].git_commit_sha).toBeNull();
    });

    it('defaults total_repetitions to 1 when missing', () => {
      const bucket = makeBucket({ total_repetitions: {} });
      const aggs = { total_runs: { value: 1 }, runs: { buckets: [bucket] } };
      const result = parseRunsListingResponse(aggs, { page: 1, perPage: 25 });
      expect(result.runs[0].total_repetitions).toBe(1);
    });
  });

  describe('buildModelDisplayId', () => {
    it('returns id when present', () => {
      expect(buildModelDisplayId('gpt-4', 'gpt-4', 'openai')).toBe('gpt-4');
    });

    it('returns provider/family when id is undefined', () => {
      expect(buildModelDisplayId(undefined, 'gpt-4', 'openai')).toBe('openai/gpt-4');
    });

    it('returns family when only family is provided', () => {
      expect(buildModelDisplayId(undefined, 'gpt-4', undefined)).toBe('gpt-4');
    });

    it('returns provider when only provider is provided', () => {
      expect(buildModelDisplayId(undefined, undefined, 'openai')).toBe('openai');
    });

    it('returns "unknown" when all parts are undefined', () => {
      expect(buildModelDisplayId(undefined, undefined, undefined)).toBe('unknown');
    });

    it('returns "unknown" when called with no arguments', () => {
      expect(buildModelDisplayId()).toBe('unknown');
    });
  });

  describe('parseStatsAggregationResponse', () => {
    it('returns empty array for undefined aggregations', () => {
      expect(parseStatsAggregationResponse(undefined)).toEqual([]);
    });

    it('returns empty array when by_dataset has no buckets', () => {
      expect(parseStatsAggregationResponse({ by_dataset: { buckets: [] } })).toEqual([]);
    });

    it('parses a dataset with evaluator buckets', () => {
      const aggs = {
        by_dataset: {
          buckets: [
            {
              key: 'ds-1',
              dataset_name: { buckets: [{ key: 'Dataset One' }] },
              by_evaluator: {
                buckets: [
                  {
                    key: 'correctness',
                    score_stats: { avg: 0.8, std_deviation: 0.1, min: 0.5, max: 1.0, count: 10 },
                    score_median: { values: { '50.0': 0.85 } },
                  },
                ],
              },
            },
          ],
        },
      };

      const result = parseStatsAggregationResponse(aggs);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        dataset_id: 'ds-1',
        dataset_name: 'Dataset One',
        evaluator_name: 'correctness',
        stats: { mean: 0.8, median: 0.85, std_dev: 0.1, min: 0.5, max: 1.0, count: 10 },
      });
    });

    it('falls back to dataset key when dataset_name bucket is empty', () => {
      const aggs = {
        by_dataset: {
          buckets: [
            {
              key: 'ds-fallback',
              dataset_name: { buckets: [] },
              by_evaluator: {
                buckets: [
                  {
                    key: 'eval-a',
                    score_stats: {},
                    score_median: { values: {} },
                  },
                ],
              },
            },
          ],
        },
      };

      const result = parseStatsAggregationResponse(aggs);
      expect(result[0].dataset_name).toBe('ds-fallback');
      expect(result[0].stats.mean).toBe(0);
    });

    it('defaults stats to 0 when score_stats fields are missing', () => {
      const aggs = {
        by_dataset: {
          buckets: [
            {
              key: 'ds-1',
              by_evaluator: {
                buckets: [{ key: 'eval-b' }],
              },
            },
          ],
        },
      };

      const result = parseStatsAggregationResponse(aggs);
      expect(result[0].stats).toEqual({
        mean: 0,
        median: 0,
        std_dev: 0,
        min: 0,
        max: 0,
        count: 0,
      });
    });
  });
});
