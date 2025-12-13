/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import { buildResultsQuery } from './query.all_results.dsl';
import type { ResultsRequestOptions } from '../../../../../common/search_strategy';
import { Direction } from '../../../../../common/search_strategy';

// Mock the utility functions

jest.mock('../../../../utils/build_query', () => ({
  getQueryFilter: jest.fn(({ filter }: { filter: string }) => ({
    query_string: {
      query: filter,
    },
  })),
}));

describe('buildResultsQuery', () => {
  describe('basic functionality', () => {
    it('should build query with minimal required parameters', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-123',
        pagination: {
          activePage: 0,
          querySize: 100,
          cursorStart: 0,
        },
        sort: [
          {
            field: '@timestamp',
            direction: Direction.desc,
          },
        ],
        kuery: '',
      };

      const result = buildResultsQuery(options);

      expect(result).toEqual({
        allow_no_indices: true,
        index: 'logs-osquery_manager.result*',
        ignore_unavailable: true,
        aggs: {
          count_by_agent_id: {
            terms: {
              field: 'elastic_agent.id',
              size: 10000,
            },
          },
          unique_agents: {
            cardinality: {
              field: 'elastic_agent.id',
            },
          },
        },
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
        from: 0,
        size: 100,
        track_total_hits: true,
        fields: ['elastic_agent.*', 'agent.*', 'osquery.*'],
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
          {
            _shard_doc: {
              order: 'desc',
            },
          },
        ],
      });
    });

    it('should build query with agentId filter', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-456',
        agentId: 'agent-789',
        pagination: {
          activePage: 1,
          querySize: 50,
          cursorStart: 0,
        },
        sort: [
          {
            field: 'agent.name',
            direction: Direction.asc,
          },
        ],
        kuery: '',
      };

      const result = buildResultsQuery(options);

      expect(result.query).toEqual({
        bool: {
          filter: [
            {
              query_string: {
                query: 'action_id: action-456 AND agent.id: agent-789',
              },
            },
          ],
        },
      });
      expect(result.from).toBe(50); // activePage * querySize
      expect(result.size).toBe(50);
    });

    it('should build query with kuery filter', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-abc',
        pagination: {
          activePage: 0,
          querySize: 25,
          cursorStart: 0,
        },
        sort: [],
        kuery: 'osquery.calendarTime: *',
      };

      const result = buildResultsQuery(options);

      expect(result.query).toEqual({
        bool: {
          filter: [
            {
              query_string: {
                query: 'action_id: action-abc AND osquery.calendarTime: *',
              },
            },
          ],
        },
      });
      expect(result.sort).toEqual([
        {
          _shard_doc: {
            order: 'desc',
          },
        },
      ]);
    });

    it('should build query with time range filter', () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const expectedEndDate = moment(startDate).clone().add(30, 'minutes').toISOString();

      const options: ResultsRequestOptions = {
        actionId: 'action-time',
        startDate,
        pagination: {
          activePage: 0,
          querySize: 10,
          cursorStart: 0,
        },
        sort: [
          {
            field: '@timestamp',
            direction: Direction.desc,
          },
        ],
        kuery: '',
      };

      const result = buildResultsQuery(options);

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

    it('should build query with integration namespaces', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-namespaced',
        pagination: {
          activePage: 0,
          querySize: 20,
          cursorStart: 0,
        },
        sort: [
          {
            field: 'agent.id',
            direction: Direction.asc,
          },
        ],
        kuery: '',
        integrationNamespaces: ['namespace1', 'namespace2'],
      };

      const result = buildResultsQuery(options);

      expect(result.index).toBe(
        'logs-osquery_manager.result-namespace1,logs-osquery_manager.result-namespace2'
      );
    });

    it('should build query with all options combined', () => {
      const startDate = '2024-06-15T10:30:00.000Z';
      const expectedEndDate = moment(startDate).clone().add(30, 'minutes').toISOString();

      const options: ResultsRequestOptions = {
        actionId: 'action-full',
        agentId: 'agent-complete',
        startDate,
        pagination: {
          activePage: 2,
          querySize: 75,
          cursorStart: 0,
        },
        sort: [
          {
            field: 'osquery.counter',
            direction: Direction.desc,
          },
          {
            field: '@timestamp',
            direction: Direction.asc,
          },
        ],
        kuery: 'agent.name: "test-agent" AND osquery.action: "executed"',
        integrationNamespaces: ['prod', 'staging'],
      };

      const result = buildResultsQuery(options);

      expect(result).toEqual({
        allow_no_indices: true,
        index: 'logs-osquery_manager.result-prod,logs-osquery_manager.result-staging',
        ignore_unavailable: true,
        aggs: {
          count_by_agent_id: {
            terms: {
              field: 'elastic_agent.id',
              size: 10000,
            },
          },
          unique_agents: {
            cardinality: {
              field: 'elastic_agent.id',
            },
          },
        },
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
                  query:
                    'action_id: action-full AND agent.id: agent-complete AND agent.name: "test-agent" AND osquery.action: "executed"',
                },
              },
            ],
          },
        },
        from: 150, // activePage (2) * querySize (75)
        size: 75,
        track_total_hits: true,
        fields: ['elastic_agent.*', 'agent.*', 'osquery.*'],
        sort: [
          {
            'osquery.counter': {
              order: 'desc',
            },
          },
          {
            '@timestamp': {
              order: 'asc',
            },
          },
          {
            _shard_doc: {
              order: 'desc',
            },
          },
        ],
      });
    });
  });

  describe('PIT pagination mode', () => {
    it('should generate query with PIT when pitId is provided', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-123',
        pitId: 'pit-abc',
        pagination: {
          activePage: 0,
          querySize: 100,
          cursorStart: 0,
        },
        sort: [
          {
            field: '@timestamp',
            direction: Direction.desc,
          },
        ],
        kuery: '',
      };

      const result = buildResultsQuery(options);

      expect(result.pit).toEqual({ id: 'pit-abc', keep_alive: '10m' });
      expect(result.index).toBeUndefined();
      expect(result.from).toBeUndefined();
    });

    it('should include search_after when provided with PIT', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-123',
        pitId: 'pit-abc',
        searchAfter: [1733900000000, 12345],
        pagination: {
          activePage: 0,
          querySize: 100,
          cursorStart: 0,
        },
        sort: [
          {
            field: '@timestamp',
            direction: Direction.desc,
          },
        ],
        kuery: '',
      };

      const result = buildResultsQuery(options);

      expect(result.search_after).toEqual([1733900000000, 12345]);
    });

    it('should add _shard_doc tiebreaker to sort for consistent pagination', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-123',
        pitId: 'pit-abc',
        pagination: {
          activePage: 0,
          querySize: 100,
          cursorStart: 0,
        },
        sort: [
          {
            field: '@timestamp',
            direction: Direction.desc,
          },
        ],
        kuery: '',
      };

      const result = buildResultsQuery(options);

      expect(result.sort).toContainEqual({ _shard_doc: { order: 'desc' } });
    });

    it('should NOT include from field when using PIT', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-123',
        pitId: 'pit-abc',
        pagination: {
          activePage: 5,
          querySize: 100,
          cursorStart: 0,
        },
        sort: [],
        kuery: '',
      };

      const result = buildResultsQuery(options);

      expect(result.from).toBeUndefined();
      expect(result.pit).toBeDefined();
    });

    it('should use offset pagination when pitId is not provided', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-123',
        pagination: {
          activePage: 2,
          querySize: 100,
          cursorStart: 0,
        },
        sort: [
          {
            field: '@timestamp',
            direction: Direction.desc,
          },
        ],
        kuery: '',
      };

      const result = buildResultsQuery(options);

      expect(result.from).toBe(200);
      expect(result.index).toBeDefined();
      expect(result.pit).toBeUndefined();
    });

    it('should set ccs_minimize_roundtrips to false for PIT queries', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-123',
        pitId: 'pit-abc',
        pagination: {
          activePage: 0,
          querySize: 100,
          cursorStart: 0,
        },
        sort: [],
        kuery: '',
      };

      const result = buildResultsQuery(options);

      expect(result.ccs_minimize_roundtrips).toBe(false);
    });

    it('should add _shard_doc tiebreaker even with empty sort array', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-123',
        pitId: 'pit-abc',
        pagination: {
          activePage: 0,
          querySize: 100,
          cursorStart: 0,
        },
        sort: [],
        kuery: '',
      };

      const result = buildResultsQuery(options);

      // Even with empty sort, _shard_doc tiebreaker should be present for consistent pagination
      expect(result.sort).toEqual([{ _shard_doc: { order: 'desc' } }]);
    });

    it('should NOT include search_after when not provided in PIT mode', () => {
      const options: ResultsRequestOptions = {
        actionId: 'action-123',
        pitId: 'pit-abc',
        pagination: {
          activePage: 0,
          querySize: 100,
          cursorStart: 0,
        },
        sort: [
          {
            field: '@timestamp',
            direction: Direction.desc,
          },
        ],
        kuery: '',
      };

      const result = buildResultsQuery(options);

      expect(result.search_after).toBeUndefined();
    });

    it('should combine PIT with filters and aggregations correctly', () => {
      const startDate = '2024-01-01T00:00:00.000Z';

      const options: ResultsRequestOptions = {
        actionId: 'action-pit-full',
        agentId: 'agent-pit',
        pitId: 'pit-xyz',
        searchAfter: [1733900000000, 999],
        startDate,
        pagination: {
          activePage: 0,
          querySize: 50,
          cursorStart: 0,
        },
        sort: [
          {
            field: '@timestamp',
            direction: Direction.desc,
          },
        ],
        kuery: 'osquery.action: "executed"',
        integrationNamespaces: ['prod'],
      };

      const result = buildResultsQuery(options);

      // PIT-specific fields
      expect(result.pit).toEqual({ id: 'pit-xyz', keep_alive: '10m' });
      expect(result.search_after).toEqual([1733900000000, 999]);
      expect(result.ccs_minimize_roundtrips).toBe(false);

      // Should NOT have offset-based fields
      expect(result.index).toBeUndefined();
      expect(result.from).toBeUndefined();
      expect(result.allow_no_indices).toBeUndefined();
      expect(result.ignore_unavailable).toBeUndefined();

      // Aggregations should still be present
      expect(result.aggs).toEqual({
        count_by_agent_id: {
          terms: {
            field: 'elastic_agent.id',
            size: 10000,
          },
        },
        unique_agents: {
          cardinality: {
            field: 'elastic_agent.id',
          },
        },
      });

      // Track total hits should be enabled
      expect(result.track_total_hits).toBe(true);

      // Size should be set correctly
      expect(result.size).toBe(50);
    });
  });
});
