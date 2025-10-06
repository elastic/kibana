/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  rowToDocument,
  toEsqlQueryHits,
  transformToEsqlTable,
  toGroupedEsqlQueryHits,
  getAlertIdFields,
} from './esql_query_utils';

describe('ESQL query utils', () => {
  const columns = [
    { name: '@timestamp', type: 'date' },
    { name: 'ecs.version', type: 'keyword' },
    { name: 'error.code', type: 'keyword' },
  ];

  const value1 = ['2023-07-12T13:32:04.174Z', '1.8.0', null];
  const value2 = ['2025-07-12T13:32:04.174Z', '1.2.0', '400'];
  const value3 = ['2025-07-12T13:32:04.174Z', '1.2.0', '200'];
  const value4 = ['2025-07-12T13:32:04.174Z', '1.2.0', null];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rowToDocument', () => {
    it('correctly converts ESQL row to document', () => {
      expect(rowToDocument(columns, value1)).toEqual({
        '@timestamp': '2023-07-12T13:32:04.174Z',
        'ecs.version': '1.8.0',
        'error.code': null,
      });
    });
  });

  describe('toEsqlQueryHits', () => {
    it('correctly converts ESQL table to ES query hits', async () => {
      const { results, rows, cols } = await toEsqlQueryHits(
        {
          columns,
          values: [value1, value2],
        },
        true, // isPreview
        1 // chunkSize
      );
      expect(results).toEqual({
        esResult: {
          _shards: {
            failed: 0,
            successful: 0,
            total: 0,
          },
          hits: {
            hits: [
              {
                _id: 'esql_query_document',
                _index: '',
                _source: {
                  '@timestamp': '2023-07-12T13:32:04.174Z',
                  'ecs.version': '1.8.0',
                  'error.code': null,
                },
              },
              {
                _id: 'esql_query_document',
                _index: '',
                _source: {
                  '@timestamp': '2025-07-12T13:32:04.174Z',
                  'ecs.version': '1.2.0',
                  'error.code': '400',
                },
              },
            ],
            total: 2,
          },
          timed_out: false,
          took: 0,
        },
        isCountAgg: true,
        isGroupAgg: false,
      });
      expect(rows).toEqual([
        {
          '@timestamp': '2023-07-12T13:32:04.174Z',
          'Alert ID': 'query matched',
          'ecs.version': '1.8.0',
          'error.code': null,
        },
        {
          '@timestamp': '2025-07-12T13:32:04.174Z',
          'ecs.version': '1.2.0',
          'error.code': '400',
        },
      ]);
      expect(cols).toEqual([
        { actions: false, id: 'Alert ID' },
        { actions: false, id: '@timestamp' },
        { actions: false, id: 'ecs.version' },
        { actions: false, id: 'error.code' },
      ]);
    });

    it('correctly calls setImmediate', async () => {
      const setImmediateSpy = jest.spyOn(global, 'setImmediate');
      const values = [];
      for (let i = 0; i < 1000; i++) {
        values.push(value1);
      }
      await toEsqlQueryHits({
        columns,
        values,
      });

      expect(setImmediateSpy).toHaveBeenCalledTimes(9);
    });
  });

  describe('toGroupedEsqlQueryHits', () => {
    it('correctly converts ESQL table to grouped ES query hits', async () => {
      const { results, rows, cols, duplicateAlertIds } = await toGroupedEsqlQueryHits(
        {
          columns,
          values: [value1, value2],
        },
        ['ecs.version'],
        true, // isPreview
        1 // chunkSize
      );
      expect(results).toEqual({
        esResult: {
          _shards: { failed: 0, successful: 0, total: 0 },
          aggregations: {
            groupAgg: {
              buckets: [
                {
                  doc_count: 1,
                  key: ['1.8.0'],
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: 'esql_query_document',
                          _index: '',
                          _source: {
                            '@timestamp': '2023-07-12T13:32:04.174Z',
                            'ecs.version': '1.8.0',
                            'error.code': null,
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  doc_count: 1,
                  key: ['1.2.0'],
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: 'esql_query_document',
                          _index: '',
                          _source: {
                            '@timestamp': '2025-07-12T13:32:04.174Z',
                            'ecs.version': '1.2.0',
                            'error.code': '400',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
          hits: { hits: [] },
          timed_out: false,
          took: 0,
        },
        isCountAgg: false,
        isGroupAgg: true,
        termField: ['ecs.version'],
      });
      expect(rows).toEqual([
        {
          '@timestamp': '2023-07-12T13:32:04.174Z',
          'Alert ID': '1.8.0',
          'ecs.version': '1.8.0',
          'error.code': null,
        },
        {
          '@timestamp': '2025-07-12T13:32:04.174Z',
          'Alert ID': '1.2.0',
          'ecs.version': '1.2.0',
          'error.code': '400',
        },
      ]);
      expect(cols).toEqual([
        { actions: false, id: 'Alert ID' },
        { actions: false, id: '@timestamp' },
        { actions: false, id: 'ecs.version' },
        { actions: false, id: 'error.code' },
      ]);
      expect(duplicateAlertIds?.size).toBe(0);
    });
    it('correctly converts ESQL table to grouped ES query hits with duplicates', async () => {
      const { results, duplicateAlertIds } = await toGroupedEsqlQueryHits(
        {
          columns,
          values: [value1, value2, value3],
        },
        ['ecs.version']
      );
      expect(results).toEqual({
        esResult: {
          _shards: { failed: 0, successful: 0, total: 0 },
          aggregations: {
            groupAgg: {
              buckets: [
                {
                  doc_count: 1,
                  key: ['1.8.0'],
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: 'esql_query_document',
                          _index: '',
                          _source: {
                            '@timestamp': '2023-07-12T13:32:04.174Z',
                            'ecs.version': '1.8.0',
                            'error.code': null,
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  doc_count: 2,
                  key: ['1.2.0'],
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: 'esql_query_document',
                          _index: '',
                          _source: {
                            '@timestamp': '2025-07-12T13:32:04.174Z',
                            'ecs.version': '1.2.0',
                            'error.code': '400',
                          },
                        },
                        {
                          _id: 'esql_query_document',
                          _index: '',
                          _source: {
                            '@timestamp': '2025-07-12T13:32:04.174Z',
                            'ecs.version': '1.2.0',
                            'error.code': '200',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
          hits: { hits: [] },
          timed_out: false,
          took: 0,
        },
        isCountAgg: false,
        isGroupAgg: true,
        termField: ['ecs.version'],
      });
      expect(duplicateAlertIds?.size).toBe(1);
    });
    it('correctly converts ESQL table to grouped ES query hits with long alertIds', async () => {
      const value5 = [
        '2023-07-12T13:32:04.174Z',
        '1.8.0',
        null,
        'www.elastic.co',
        'test',
        'US',
        'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
        'info',
        'test message',
        '/app-search',
      ];
      const value6 = [
        '2025-07-12T13:32:04.174Z',
        '1.2.0',
        '400',
        'artifacts.elastic.co',
        'test',
        'US',
        'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
        'info',
        'test message',
        '/app-search',
      ];
      const { results, longAlertIds } = await toGroupedEsqlQueryHits(
        {
          columns: [
            { name: '@timestamp', type: 'date' },
            { name: 'ecs.version', type: 'keyword' },
            { name: 'error.code', type: 'keyword' },
            { name: 'host', type: 'keyword' },
            { name: 'name', type: 'keyword' },
            { name: 'geo.dest', type: 'keyword' },
            { name: 'agent', type: 'keyword' },
            { name: 'tags', type: 'keyword' },
            { name: 'message', type: 'keyword' },
            { name: 'request', type: 'keyword' },
          ],
          values: [value5, value6],
        },
        [
          '@timestamp',
          'ecs.version',
          'error.code',
          'host',
          'name',
          'geo.dest',
          'agent',
          'tags',
          'message',
          'request',
        ],
        true // isPreview
      );
      expect(results).toEqual({
        esResult: {
          _shards: {
            failed: 0,
            successful: 0,
            total: 0,
          },
          aggregations: {
            groupAgg: {
              buckets: [
                {
                  doc_count: 1,
                  key: [
                    '2023-07-12T13:32:04.174Z',
                    '1.8.0',
                    'www.elastic.co',
                    'test',
                    'US',
                    'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
                    'info',
                    'test message',
                    '/app-search',
                  ],
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: 'esql_query_document',
                          _index: '',
                          _source: {
                            '@timestamp': '2023-07-12T13:32:04.174Z',
                            agent:
                              'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
                            'ecs.version': '1.8.0',
                            'error.code': null,
                            'geo.dest': 'US',
                            host: 'www.elastic.co',
                            message: 'test message',
                            name: 'test',
                            request: '/app-search',
                            tags: 'info',
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  doc_count: 1,
                  key: [
                    '2025-07-12T13:32:04.174Z',
                    '1.2.0',
                    '400',
                    'artifacts.elastic.co',
                    'test',
                    'US',
                    'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
                    'info',
                    'test message',
                    '/app-search',
                  ],
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: 'esql_query_document',
                          _index: '',
                          _source: {
                            '@timestamp': '2025-07-12T13:32:04.174Z',
                            agent:
                              'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
                            'ecs.version': '1.2.0',
                            'error.code': '400',
                            'geo.dest': 'US',
                            host: 'artifacts.elastic.co',
                            message: 'test message',
                            name: 'test',
                            request: '/app-search',

                            tags: 'info',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
          hits: {
            hits: [],
          },
          timed_out: false,
          took: 0,
        },
        isCountAgg: false,
        isGroupAgg: true,
        termField: [
          '@timestamp',
          'ecs.version',
          'error.code',
          'host',
          'name',
          'geo.dest',
          'agent',
          'tags',
          'message',
          'request',
        ],
      });
      expect(longAlertIds?.size).toBe(1);
    });
    it('correctly converts ESQL table to grouped ES query hits and ignores undefined and null alertIds', async () => {
      const { results, rows, cols, duplicateAlertIds } = await toGroupedEsqlQueryHits(
        {
          columns,
          values: [value1, value2, value4],
        },
        ['error.code'],
        true // isPreview
      );
      expect(results).toEqual({
        esResult: {
          _shards: { failed: 0, successful: 0, total: 0 },
          aggregations: {
            groupAgg: {
              buckets: [
                {
                  doc_count: 1,
                  key: ['400'],
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: 'esql_query_document',
                          _index: '',
                          _source: {
                            '@timestamp': '2025-07-12T13:32:04.174Z',
                            'ecs.version': '1.2.0',
                            'error.code': '400',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
          hits: { hits: [] },
          timed_out: false,
          took: 0,
        },
        isCountAgg: false,
        isGroupAgg: true,
        termField: ['error.code'],
      });
      expect(rows).toEqual([
        {
          '@timestamp': '2025-07-12T13:32:04.174Z',
          'Alert ID': '400',
          'ecs.version': '1.2.0',
          'error.code': '400',
        },
      ]);
      expect(cols).toEqual([
        { actions: false, id: 'Alert ID' },
        { actions: false, id: '@timestamp' },
        { actions: false, id: 'ecs.version' },
        { actions: false, id: 'error.code' },
      ]);
      expect(duplicateAlertIds?.size).toBe(0);
    });
    it('correctly converts ESQL table to grouped ES query hits and ignores undefined and null values in the alertId', async () => {
      const { results, rows, cols, duplicateAlertIds } = await toGroupedEsqlQueryHits(
        {
          columns,
          values: [value1, value2, value4],
        },
        ['error.code', 'ecs.version'],
        true // isPreview
      );
      expect(results).toEqual({
        esResult: {
          _shards: { failed: 0, successful: 0, total: 0 },
          aggregations: {
            groupAgg: {
              buckets: [
                {
                  doc_count: 1,
                  key: ['1.8.0'],
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: 'esql_query_document',
                          _index: '',
                          _source: {
                            '@timestamp': '2023-07-12T13:32:04.174Z',
                            'ecs.version': '1.8.0',
                            'error.code': null,
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  doc_count: 1,
                  key: ['400', '1.2.0'],
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: 'esql_query_document',
                          _index: '',
                          _source: {
                            '@timestamp': '2025-07-12T13:32:04.174Z',
                            'ecs.version': '1.2.0',
                            'error.code': '400',
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  doc_count: 1,
                  key: ['1.2.0'],
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: 'esql_query_document',
                          _index: '',
                          _source: {
                            '@timestamp': '2025-07-12T13:32:04.174Z',
                            'ecs.version': '1.2.0',
                            'error.code': null,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
          hits: { hits: [] },
          timed_out: false,
          took: 0,
        },
        isCountAgg: false,
        isGroupAgg: true,
        termField: ['error.code', 'ecs.version'],
      });
      expect(rows).toEqual([
        {
          '@timestamp': '2023-07-12T13:32:04.174Z',
          'Alert ID': '1.8.0',
          'ecs.version': '1.8.0',
          'error.code': null,
        },
        {
          '@timestamp': '2025-07-12T13:32:04.174Z',
          'Alert ID': '400,1.2.0',
          'ecs.version': '1.2.0',
          'error.code': '400',
        },
        {
          '@timestamp': '2025-07-12T13:32:04.174Z',
          'Alert ID': '1.2.0',
          'ecs.version': '1.2.0',
          'error.code': null,
        },
      ]);
      expect(cols).toEqual([
        { actions: false, id: 'Alert ID' },
        { actions: false, id: '@timestamp' },
        { actions: false, id: 'ecs.version' },
        { actions: false, id: 'error.code' },
      ]);
      expect(duplicateAlertIds?.size).toBe(0);
    });
    it('correctly calls setImmediate', async () => {
      const setImmediateSpy = jest.spyOn(global, 'setImmediate');
      const values = [];
      for (let i = 0; i < 1000; i++) {
        values.push(value1);
      }
      await toGroupedEsqlQueryHits(
        {
          columns,
          values,
        },
        ['error.code', 'ecs.version']
      );

      expect(setImmediateSpy).toHaveBeenCalledTimes(9);
    });
  });

  describe('transformToEsqlTable', () => {
    it('correctly converts data table to ESQL table', () => {
      expect(
        transformToEsqlTable({
          columns: [
            { name: '@timestamp', type: 'date' },
            { name: 'ecs.version', type: 'string' },
            { name: 'error.code', type: 'string' },
          ],
          values: [['2023-07-12T13:32:04.174Z', '1.8.0', null]],
        })
      ).toEqual({
        columns: [
          {
            name: '@timestamp',
            type: 'date',
          },
          {
            name: 'ecs.version',
            type: 'string',
          },
          {
            name: 'error.code',
            type: 'string',
          },
        ],
        values: [['2023-07-12T13:32:04.174Z', '1.8.0', null]],
      });
    });
  });

  describe('getAlertIdFields', () => {
    it('correctly gets the alertId from an ESQL query that uses only STATS', () => {
      expect(
        getAlertIdFields('FROM test-index | STATS count = COUNT(*)', [
          { name: 'host', type: 'keyword' },
          { name: 'error.code', type: 'keyword' },
          { name: 'count', type: 'number' },
        ])
      ).toEqual(['host', 'error.code', 'count']);
    });

    it('correctly gets the alertId from an ESQL query that uses STATS...BY', () => {
      expect(
        getAlertIdFields('FROM test-index | STATS count = COUNT(*) BY error.code, host', [
          { name: 'host', type: 'keyword' },
          { name: 'error.code', type: 'keyword' },
          { name: 'count', type: 'number' },
        ])
      ).toEqual(['error.code', 'host']);
    });

    it('correctly gets the alertId from an ESQL query that uses STATS...BY and RENAME', () => {
      expect(
        getAlertIdFields(
          'FROM test-index | STATS count = COUNT(*) BY error.code, host | RENAME error.code AS code, host AS h | RENAME code AS c',
          [
            { name: 'h', type: 'keyword' },
            { name: 'c', type: 'keyword' },
            { name: 'count', type: 'number' },
          ]
        )
      ).toEqual(['c', 'h']);

      expect(
        getAlertIdFields(
          'FROM test-index | STATS count = COUNT(*) BY error.code, host | RENAME code = error.code, h = host | RENAME c = code',
          [
            { name: 'h', type: 'keyword' },
            { name: 'c', type: 'keyword' },
            { name: 'count', type: 'number' },
          ]
        )
      ).toEqual(['c', 'h']);
    });

    it('correctly gets the alertId from an ESQL query that uses STATS...BY and drops fields', () => {
      expect(
        getAlertIdFields(
          'FROM test-index | STATS count = COUNT(*) BY error.code, host | KEEP host, count',
          [
            { name: 'host', type: 'keyword' },
            { name: 'count', type: 'number' },
          ]
        )
      ).toEqual(['host']);
    });

    it('correctly gets the alertId from an ESQL query that uses METADATA _id', () => {
      expect(
        getAlertIdFields('FROM test-index METADATA _id | KEEP host, _id', [
          { name: 'host', type: 'keyword' },
          { name: '_id', type: 'keyword' },
        ])
      ).toEqual(['_id']);
    });

    it('correctly gets the alertId from an ESQL query that uses METADATA _id and drops then drops the _id field', () => {
      expect(
        getAlertIdFields('FROM test-index METADATA _id | KEEP host', [
          { name: 'host', type: 'keyword' },
        ])
      ).toEqual(['host']);
    });

    it('correctly gets the alertId from all columns', () => {
      expect(
        getAlertIdFields('FROM test-index', [
          { name: 'host', type: 'keyword' },
          { name: 'error.code', type: 'keyword' },
          { name: 'ecs.version', type: 'keyword' },
        ])
      ).toEqual(['host', 'error.code', 'ecs.version']);
    });
  });
});
