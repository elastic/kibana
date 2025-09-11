/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { buildActionResultsQuery } from './query.action_results.dsl';
import {
  Direction,
  type ActionResultsRequestOptions,
} from '../../../../../../common/search_strategy';

jest.mock('../../../../../utils/build_query', () => ({
  getQueryFilter: jest.fn(({ filter }: { filter: string }) => ({
    query_string: {
      query: filter,
    },
  })),
}));

describe('buildActionResultsQuery', () => {
  describe('basic functionality', () => {
    it('should build query with minimal required parameters using agent actions results index', () => {
      const options: ActionResultsRequestOptions = {
        actionId: 'action-123',
        pagination: {
          activePage: 0,
          querySize: 50,
          cursorStart: 0,
        },
        sort: {
          field: 'started_at',
          direction: Direction.desc,
        },
        componentTemplateExists: false,
        useNewDataStream: false,
      };

      const result = buildActionResultsQuery(options);

      expect(result).toEqual({
        allow_no_indices: true,
        index: '.fleet-actions-results*',
        ignore_unavailable: true,
        aggs: {
          aggs: {
            global: {},
            aggs: {
              responses_by_action_id: {
                filter: {
                  bool: {
                    must: [
                      {
                        match: {
                          action_id: 'action-123',
                        },
                      },
                    ],
                  },
                },
                aggs: {
                  rows_count: {
                    sum: {
                      field: 'action_response.osquery.count',
                    },
                  },
                  responses: {
                    terms: {
                      script: {
                        lang: 'painless',
                        source:
                          "if (doc['error.keyword'].size()==0) { return 'success' } else { return 'error' }",
                      },
                    },
                  },
                },
              },
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
        size: 10000,
        track_total_hits: true,
        fields: ['*'],
        sort: [
          {
            started_at: {
              order: 'desc',
            },
          },
        ],
      });
    });

    it('should build query using component template index when componentTemplateExists is true', () => {
      const options: ActionResultsRequestOptions = {
        actionId: 'action-456',
        pagination: {
          activePage: 0,
          querySize: 100,
          cursorStart: 0,
        },
        sort: {
          field: '@timestamp',
          direction: Direction.asc,
        },
        componentTemplateExists: true,
        useNewDataStream: false,
      };

      const result = buildActionResultsQuery(options);

      expect(result.index).toBe('.logs-osquery_manager.action.responses*');
    });

    it('should build query using new data stream when useNewDataStream is true', () => {
      const options: ActionResultsRequestOptions = {
        actionId: 'action-789',
        pagination: {
          activePage: 0,
          querySize: 200,
          cursorStart: 0,
        },
        sort: {
          field: 'agent.id',
          direction: Direction.desc,
        },
        componentTemplateExists: false,
        useNewDataStream: true,
      };

      const result = buildActionResultsQuery(options);

      expect(result.index).toBe('logs-osquery_manager.action.responses*');
    });

    it('should build query with kuery filter', () => {
      const options: ActionResultsRequestOptions = {
        actionId: 'action-kuery',
        kuery: 'agent.name: "test-agent" AND error.message: *timeout*',
        pagination: {
          activePage: 0,
          querySize: 25,
          cursorStart: 0,
        },
        sort: {
          field: 'started_at',
          direction: Direction.desc,
        },
        componentTemplateExists: true,
        useNewDataStream: false,
      };

      const result = buildActionResultsQuery(options);

      expect(result.query).toEqual({
        bool: {
          filter: [
            {
              query_string: {
                query:
                  'action_id: action-kuery AND agent.name: "test-agent" AND error.message: *timeout*',
              },
            },
          ],
        },
      });
    });

    it('should build query with time range filter', () => {
      const startDate = '2024-03-15T14:20:00.000Z';
      const expectedEndDate = moment(startDate).clone().add(30, 'minutes').toISOString();

      const options: ActionResultsRequestOptions = {
        actionId: 'action-time-range',
        startDate,
        pagination: {
          activePage: 0,
          querySize: 75,
          cursorStart: 0,
        },
        sort: {
          field: 'completed_at',
          direction: Direction.asc,
        },
        componentTemplateExists: false,
        useNewDataStream: true,
      };

      const result = buildActionResultsQuery(options);

      expect(result.query).toEqual({
        bool: {
          filter: [
            {
              range: {
                started_at: {
                  gte: startDate,
                  lte: expectedEndDate,
                },
              },
            },
            {
              query_string: {
                query: 'action_id: action-time-range',
              },
            },
          ],
        },
      });
    });

    it('should build query with integration namespaces', () => {
      const options: ActionResultsRequestOptions = {
        actionId: 'action-namespaced',
        pagination: {
          activePage: 0,
          querySize: 15,
          cursorStart: 0,
        },
        sort: {
          field: 'agent.hostname',
          direction: Direction.asc,
        },
        componentTemplateExists: true,
        useNewDataStream: false,
        integrationNamespaces: ['production', 'development'],
      };

      const result = buildActionResultsQuery(options);

      expect(result.index).toBe(
        '.logs-osquery_manager.action.responses-production,.logs-osquery_manager.action.responses-development'
      );
    });

    it('should build query with all options combined', () => {
      const startDate = '2024-07-01T08:45:00.000Z';
      const expectedEndDate = moment(startDate).clone().add(30, 'minutes').toISOString();

      const options: ActionResultsRequestOptions = {
        actionId: 'action-comprehensive',
        kuery: 'error.type: "timeout" OR status: "failed"',
        startDate,
        pagination: {
          activePage: 1,
          querySize: 500,
          cursorStart: 0,
        },
        sort: {
          field: 'error.message',
          direction: Direction.desc,
        },
        componentTemplateExists: false,
        useNewDataStream: true,
        integrationNamespaces: ['staging', 'qa'],
      };

      const result = buildActionResultsQuery(options);

      expect(result).toEqual({
        allow_no_indices: true,
        index:
          'logs-osquery_manager.action.responses-staging,logs-osquery_manager.action.responses-qa',
        ignore_unavailable: true,
        aggs: {
          aggs: {
            global: {},
            aggs: {
              responses_by_action_id: {
                filter: {
                  bool: {
                    must: [
                      {
                        match: {
                          action_id: 'action-comprehensive',
                        },
                      },
                    ],
                  },
                },
                aggs: {
                  rows_count: {
                    sum: {
                      field: 'action_response.osquery.count',
                    },
                  },
                  responses: {
                    terms: {
                      script: {
                        lang: 'painless',
                        source:
                          "if (doc['error.keyword'].size()==0) { return 'success' } else { return 'error' }",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        query: {
          bool: {
            filter: [
              {
                range: {
                  started_at: {
                    gte: startDate,
                    lte: expectedEndDate,
                  },
                },
              },
              {
                query_string: {
                  query:
                    'action_id: action-comprehensive AND error.type: "timeout" OR status: "failed"',
                },
              },
            ],
          },
        },
        size: 10000,
        track_total_hits: true,
        fields: ['*'],
        sort: [
          {
            'error.message': {
              order: 'desc',
            },
          },
        ],
      });
    });
  });

  describe('index selection logic', () => {
    it('should prioritize useNewDataStream over componentTemplateExists', () => {
      const options: ActionResultsRequestOptions = {
        actionId: 'action-priority-test',
        pagination: {
          activePage: 0,
          querySize: 10,
          cursorStart: 0,
        },
        sort: {
          field: 'started_at',
          direction: Direction.desc,
        },
        componentTemplateExists: true,
        useNewDataStream: true, // This should take priority
      };

      const result = buildActionResultsQuery(options);

      expect(result.index).toBe('logs-osquery_manager.action.responses*');
    });

    it('should fall back to agent actions results index when both flags are false', () => {
      const options: ActionResultsRequestOptions = {
        actionId: 'action-fallback-test',
        pagination: {
          activePage: 0,
          querySize: 10,
          cursorStart: 0,
        },
        sort: {
          field: 'started_at',
          direction: Direction.desc,
        },
        componentTemplateExists: false,
        useNewDataStream: false,
      };

      const result = buildActionResultsQuery(options);

      expect(result.index).toBe('.fleet-actions-results*');
    });
  });
});
