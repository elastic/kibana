/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityCountQuery } from './entity_count';

describe('getEntityCountQuery', () => {
  it('generates a valid esql query for a single source', () => {
    const { query, filter } = getEntityCountQuery({
      sources: [
        {
          id: 'service_source',
          type_id: 'service',
          index_patterns: ['logs-*'],
          identity_fields: ['service.name'],
          metadata_fields: [],
          filters: [],
          timestamp_field: '@timestamp',
        },
      ],
      filters: [],
      start: '2024-11-20T19:00:00.000Z',
      end: '2024-11-20T20:00:00.000Z',
    });

    expect(query).toEqual(
      'FROM logs-* | STATS BY service.name::keyword | STATS count = COUNT() | LIMIT 1000'
    );

    expect(filter).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  exists: {
                    field: 'service.name',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        range: {
                          '@timestamp': {
                            gte: '2024-11-20T19:00:00.000Z',
                          },
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        range: {
                          '@timestamp': {
                            lte: '2024-11-20T20:00:00.000Z',
                          },
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          _index: 'logs-**',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          _index: '.ds-logs-**',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });

  it('generates a valid esql query for multiple sources', () => {
    const { query, filter } = getEntityCountQuery({
      sources: [
        {
          id: 'service_source_1',
          type_id: 'service',
          index_patterns: ['metrics-*'],
          identity_fields: ['service_name'],
          metadata_fields: [],
          filters: [],
          timestamp_field: 'timestamp_field',
        },
        {
          id: 'service_source_2',
          type_id: 'service',
          index_patterns: ['logs-*'],
          identity_fields: ['service.name'],
          metadata_fields: [],
          filters: [],
          timestamp_field: '@timestamp',
        },
      ],
      filters: [],
      start: '2024-11-20T19:00:00.000Z',
      end: '2024-11-20T20:00:00.000Z',
    });

    expect(query).toEqual(
      'FROM metrics-*, logs-* METADATA _index | ' +
        'EVAL is_source_0 = _index LIKE "metrics-**" OR _index LIKE ".ds-metrics-**" | ' +
        'EVAL is_source_1 = _index LIKE "logs-**" OR _index LIKE ".ds-logs-**" | ' +
        'EVAL entity.id = CASE(is_source_0, service_name::keyword, is_source_1, service.name::keyword) | ' +
        'WHERE entity.id IS NOT NULL | ' +
        'STATS BY entity.id | ' +
        'STATS count = COUNT() | ' +
        'LIMIT 1000'
    );

    expect(filter).toEqual({
      bool: {
        should: [
          {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: 'service_name',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              range: {
                                timestamp_field: {
                                  gte: '2024-11-20T19:00:00.000Z',
                                },
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [
                            {
                              range: {
                                timestamp_field: {
                                  lte: '2024-11-20T20:00:00.000Z',
                                },
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                _index: 'metrics-**',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                _index: '.ds-metrics-**',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: 'service.name',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              range: {
                                '@timestamp': {
                                  gte: '2024-11-20T19:00:00.000Z',
                                },
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [
                            {
                              range: {
                                '@timestamp': {
                                  lte: '2024-11-20T20:00:00.000Z',
                                },
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                _index: 'logs-**',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                _index: '.ds-logs-**',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });
});
