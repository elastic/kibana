/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  buildResultsAgentsQuery,
  COMPOSITE_AGGREGATION_BATCH_SIZE,
} from './query.results_agents.dsl';
import { ACTION_EXPIRATION, OSQUERY_INTEGRATION_NAME } from '../../../../../../common/constants';

jest.mock('../../../../../utils/build_query', () => ({
  getQueryFilter: jest.fn(({ filter }: { filter: string }) => ({
    query_string: {
      query: filter,
    },
  })),
}));

describe('buildResultsAgentsQuery', () => {
  describe('basic functionality', () => {
    it('should build query with minimal required parameters', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-123',
      });

      expect(result).toEqual({
        allow_no_indices: true,
        index: `logs-${OSQUERY_INTEGRATION_NAME}.result*`,
        ignore_unavailable: true,
        size: 0,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: 'action_id: action-123',
                },
              },
            ],
          },
        },
        aggs: {
          unique_agents: {
            composite: {
              size: COMPOSITE_AGGREGATION_BATCH_SIZE,
              sources: [
                {
                  agent_id: {
                    terms: {
                      field: 'agent.id',
                    },
                  },
                },
              ],
            },
          },
        },
      });
    });

    it('should include action_id filter in query', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'test-action-456',
      });

      expect(result.query).toEqual({
        bool: {
          filter: [
            {
              query_string: {
                query: 'action_id: test-action-456',
              },
            },
          ],
        },
      });
    });

    it('should use composite aggregation for unlimited scale', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-789',
      });

      expect(result.aggs?.unique_agents).toHaveProperty('composite');
      expect(result.aggs?.unique_agents.composite).toHaveProperty('size', COMPOSITE_AGGREGATION_BATCH_SIZE);
      expect(result.aggs?.unique_agents.composite).toHaveProperty('sources');
    });

    it('should set size to 0 to only return aggregations', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-no-docs',
      });

      expect(result.size).toBe(0);
    });

    it('should enable track_total_hits', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-track',
      });

      expect(result.track_total_hits).toBe(true);
    });
  });

  describe('index pattern generation', () => {
    it('should build base index pattern without namespaces', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-base-index',
      });

      expect(result.index).toBe(`logs-${OSQUERY_INTEGRATION_NAME}.result*`);
    });

    it('should build index pattern with single namespace', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-ns',
        integrationNamespaces: ['production'],
      });

      expect(result.index).toBe(`logs-${OSQUERY_INTEGRATION_NAME}.result-production`);
    });

    it('should build index pattern with multiple namespaces', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-multi-ns',
        integrationNamespaces: ['production', 'staging', 'development'],
      });

      expect(result.index).toBe(
        `logs-${OSQUERY_INTEGRATION_NAME}.result-production,logs-${OSQUERY_INTEGRATION_NAME}.result-staging,logs-${OSQUERY_INTEGRATION_NAME}.result-development`
      );
    });

    it('should handle empty namespaces array', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-empty-ns',
        integrationNamespaces: [],
      });

      expect(result.index).toBe(`logs-${OSQUERY_INTEGRATION_NAME}.result*`);
    });

    it('should handle namespace with special characters', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-special-ns',
        integrationNamespaces: ['prod-us-east-1'],
      });

      expect(result.index).toBe(`logs-${OSQUERY_INTEGRATION_NAME}.result-prod-us-east-1`);
    });
  });

  describe('time range filtering', () => {
    it('should add time range filter when startDate is provided', () => {
      const startDate = '2024-03-15T14:20:00.000Z';
      const expectedEndDate = moment(startDate)
        .clone()
        .add(ACTION_EXPIRATION.SEARCH_WINDOW_MINUTES, 'minutes')
        .toISOString();

      const result = buildResultsAgentsQuery({
        actionId: 'action-time',
        startDate,
      });

      expect(result.query).toEqual({
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: startDate,
                  lte: expectedEndDate,
                },
              },
            },
            {
              query_string: {
                query: 'action_id: action-time',
              },
            },
          ],
        },
      });
    });

    it('should use SEARCH_WINDOW_MINUTES for time range', () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const result = buildResultsAgentsQuery({
        actionId: 'action-window',
        startDate,
      });

      const timeRangeFilter = result.query?.bool?.filter?.find(
        (f: any) => f.range && f.range['@timestamp']
      ) as any;

      const expectedEnd = moment(startDate)
        .add(ACTION_EXPIRATION.SEARCH_WINDOW_MINUTES, 'minutes')
        .toISOString();

      expect(timeRangeFilter.range['@timestamp'].lte).toBe(expectedEnd);
    });

    it('should not add time range filter when startDate is undefined', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-no-time',
      });

      const hasTimeRange = result.query?.bool?.filter?.some(
        (f: any) => f.range && f.range['@timestamp']
      );

      expect(hasTimeRange).toBeFalsy();
    });

    it('should not add time range filter when startDate is empty string', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-empty-time',
        startDate: '',
      });

      const hasTimeRange = result.query?.bool?.filter?.some(
        (f: any) => f.range && f.range['@timestamp']
      );

      expect(hasTimeRange).toBeFalsy();
    });

    it('should handle time range with ISO 8601 format', () => {
      const startDate = '2024-06-15T08:30:45.123Z';
      const result = buildResultsAgentsQuery({
        actionId: 'action-iso',
        startDate,
      });

      const timeRangeFilter = result.query?.bool?.filter?.find(
        (f: any) => f.range && f.range['@timestamp']
      ) as any;

      expect(timeRangeFilter).toBeDefined();
      expect(timeRangeFilter.range['@timestamp'].gte).toBe(startDate);
    });
  });

  describe('composite aggregation pagination', () => {
    it('should not include after key on first request', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-first-page',
      });

      expect(result.aggs?.unique_agents.composite).not.toHaveProperty('after');
    });

    it('should include after key for subsequent requests', () => {
      const afterKey = { agent_id: 'agent-999' };
      const result = buildResultsAgentsQuery({
        actionId: 'action-next-page',
        afterKey,
      });

      expect(result.aggs?.unique_agents.composite).toHaveProperty('after', afterKey);
    });

    it('should handle after key with different agent ID', () => {
      const afterKey = { agent_id: 'last-agent-id-from-previous-batch' };
      const result = buildResultsAgentsQuery({
        actionId: 'action-pagination',
        afterKey,
      });

      expect(result.aggs?.unique_agents.composite.after).toEqual(afterKey);
    });

    it('should use correct batch size', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-batch',
      });

      expect(result.aggs?.unique_agents.composite.size).toBe(COMPOSITE_AGGREGATION_BATCH_SIZE);
    });

    it('should aggregate by agent.id field', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-field',
      });

      const sources = result.aggs?.unique_agents.composite.sources;

      expect(sources).toHaveLength(1);
      expect(sources?.[0]).toEqual({
        agent_id: {
          terms: {
            field: 'agent.id',
          },
        },
      });
    });
  });

  describe('combined parameters', () => {
    it('should build query with all parameters', () => {
      const startDate = '2024-05-10T10:00:00.000Z';
      const afterKey = { agent_id: 'agent-500' };
      const integrationNamespaces = ['prod', 'staging'];

      const result = buildResultsAgentsQuery({
        actionId: 'action-full',
        startDate,
        integrationNamespaces,
        afterKey,
      });

      const expectedEndDate = moment(startDate)
        .add(ACTION_EXPIRATION.SEARCH_WINDOW_MINUTES, 'minutes')
        .toISOString();

      expect(result).toEqual({
        allow_no_indices: true,
        index: `logs-${OSQUERY_INTEGRATION_NAME}.result-prod,logs-${OSQUERY_INTEGRATION_NAME}.result-staging`,
        ignore_unavailable: true,
        size: 0,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: startDate,
                    lte: expectedEndDate,
                  },
                },
              },
              {
                query_string: {
                  query: 'action_id: action-full',
                },
              },
            ],
          },
        },
        aggs: {
          unique_agents: {
            composite: {
              size: COMPOSITE_AGGREGATION_BATCH_SIZE,
              sources: [
                {
                  agent_id: {
                    terms: {
                      field: 'agent.id',
                    },
                  },
                },
              ],
              after: afterKey,
            },
          },
        },
      });
    });

    it('should maintain filter order: time range then action_id', () => {
      const startDate = '2024-07-20T15:00:00.000Z';

      const result = buildResultsAgentsQuery({
        actionId: 'action-order',
        startDate,
      });

      const filters = result.query?.bool?.filter;

      expect(filters).toHaveLength(2);
      expect(filters?.[0]).toHaveProperty('range');
      expect(filters?.[1]).toHaveProperty('query_string');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very long action ID', () => {
      const longActionId = 'a'.repeat(1000);

      const result = buildResultsAgentsQuery({
        actionId: longActionId,
      });

      expect(result.query?.bool?.filter?.[0]).toEqual({
        query_string: {
          query: `action_id: ${longActionId}`,
        },
      });
    });

    it('should handle action ID with special characters', () => {
      const specialActionId = 'action-123_test.query@v1';

      const result = buildResultsAgentsQuery({
        actionId: specialActionId,
      });

      expect(result.query?.bool?.filter?.[0]).toEqual({
        query_string: {
          query: `action_id: ${specialActionId}`,
        },
      });
    });

    it('should handle single namespace in array', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-single',
        integrationNamespaces: ['default'],
      });

      expect(result.index).toBe(`logs-${OSQUERY_INTEGRATION_NAME}.result-default`);
    });

    it('should handle many namespaces (10+)', () => {
      const namespaces = Array.from({ length: 15 }, (_, i) => `namespace-${i}`);

      const result = buildResultsAgentsQuery({
        actionId: 'action-many-ns',
        integrationNamespaces: namespaces,
      });

      const expectedIndex = namespaces
        .map((ns) => `logs-${OSQUERY_INTEGRATION_NAME}.result-${ns}`)
        .join(',');

      expect(result.index).toBe(expectedIndex);
    });

    it('should handle startDate at exact search window boundary', () => {
      const startDate = moment().subtract(ACTION_EXPIRATION.SEARCH_WINDOW_MINUTES, 'minutes').toISOString();

      const result = buildResultsAgentsQuery({
        actionId: 'action-boundary',
        startDate,
      });

      const timeRangeFilter = result.query?.bool?.filter?.find(
        (f: any) => f.range && f.range['@timestamp']
      ) as any;

      expect(timeRangeFilter).toBeDefined();
      expect(timeRangeFilter.range['@timestamp'].gte).toBe(startDate);
    });
  });

  describe('query optimization characteristics', () => {
    it('should enable allow_no_indices for graceful handling of missing indices', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-allow',
      });

      expect(result.allow_no_indices).toBe(true);
    });

    it('should enable ignore_unavailable for fault tolerance', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-ignore',
      });

      expect(result.ignore_unavailable).toBe(true);
    });

    it('should request no documents (size=0) for aggregation-only queries', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-agg-only',
      });

      expect(result.size).toBe(0);
    });

    it('should track total hits for result count', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-total',
      });

      expect(result.track_total_hits).toBe(true);
    });
  });

  describe('realistic scenarios', () => {
    it('should build query for initial page of large agent set (15k+ agents)', () => {
      const startDate = '2024-08-01T12:00:00.000Z';

      const result = buildResultsAgentsQuery({
        actionId: 'action-large-initial',
        startDate,
        integrationNamespaces: ['production'],
      });

      expect(result.aggs?.unique_agents.composite.size).toBe(COMPOSITE_AGGREGATION_BATCH_SIZE);
      expect(result.aggs?.unique_agents.composite).not.toHaveProperty('after');
    });

    it('should build query for subsequent page of large agent set', () => {
      const startDate = '2024-08-01T12:00:00.000Z';
      const afterKey = { agent_id: 'agent-9999' };

      const result = buildResultsAgentsQuery({
        actionId: 'action-large-next',
        startDate,
        integrationNamespaces: ['production'],
        afterKey,
      });

      expect(result.aggs?.unique_agents.composite).toHaveProperty('after', afterKey);
    });

    it('should build query for multi-region deployment', () => {
      const result = buildResultsAgentsQuery({
        actionId: 'action-multi-region',
        integrationNamespaces: ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-1'],
      });

      expect(result.index).toContain('result-us-east-1');
      expect(result.index).toContain('result-us-west-2');
      expect(result.index).toContain('result-eu-central-1');
      expect(result.index).toContain('result-ap-southeast-1');
    });

    it('should build query for action with recent startDate', () => {
      const startDate = moment().subtract(5, 'minutes').toISOString();

      const result = buildResultsAgentsQuery({
        actionId: 'action-recent',
        startDate,
      });

      const timeRangeFilter = result.query?.bool?.filter?.find(
        (f: any) => f.range && f.range['@timestamp']
      ) as any;

      expect(timeRangeFilter.range['@timestamp'].gte).toBe(startDate);

      const expectedEnd = moment(startDate)
        .add(ACTION_EXPIRATION.SEARCH_WINDOW_MINUTES, 'minutes')
        .toISOString();

      expect(timeRangeFilter.range['@timestamp'].lte).toBe(expectedEnd);
    });
  });
});
