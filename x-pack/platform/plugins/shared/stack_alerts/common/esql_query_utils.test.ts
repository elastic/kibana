/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  rowToDocument,
  toEsQueryHits,
  transformDatatableToEsqlTable,
  toGroupedEsQueryHits,
  getAlertId,
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

  describe('rowToDocument', () => {
    it('correctly converts ESQL row to document', () => {
      expect(rowToDocument(columns, value1)).toEqual({
        '@timestamp': '2023-07-12T13:32:04.174Z',
        'ecs.version': '1.8.0',
        'error.code': null,
      });
    });
  });

  describe('toEsQueryHits', () => {
    it('correctly converts ESQL table to ES query hits', () => {
      const { results, rows, cols, duplicateAlertIds } = toEsQueryHits({
        columns,
        values: [value1, value2],
      });
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
      expect(duplicateAlertIds.size).toBe(0);
    });
  });

  describe('toGroupedEsQueryHits', () => {
    it('correctly converts ESQL table to grouped ES query hits', () => {
      const { results, rows, cols, duplicateAlertIds } = toGroupedEsQueryHits(
        {
          columns,
          values: [value1, value2],
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
                  key: '1.8.0',
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
                  key: '1.2.0',
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
      expect(duplicateAlertIds.size).toBe(0);
    });
    it('correctly converts ESQL table to grouped ES query hits with duplicates', () => {
      const { results, duplicateAlertIds } = toGroupedEsQueryHits(
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
                  key: '1.8.0',
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
                  key: '1.2.0',
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
      });
      expect(duplicateAlertIds.size).toBe(1);
    });
  });

  describe('transformDatatableToEsqlTable', () => {
    it('correctly converts data table to ESQL table', () => {
      expect(
        transformDatatableToEsqlTable({
          type: 'datatable',
          columns: [
            { id: '@timestamp', name: '@timestamp', meta: { type: 'date' } },
            { id: 'ecs.version', name: 'ecs.version', meta: { type: 'string' } },
            { id: 'error.code', name: 'error.code', meta: { type: 'string' } },
          ],
          rows: [
            {
              '@timestamp': '2023-07-12T13:32:04.174Z',
              'ecs.version': '1.8.0',
              'error.code': null,
            },
          ],
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

  describe('getAlertId', () => {
    it('correctly gets the alertId from an ESQL query that uses only STATS', () => {
      expect(
        getAlertId('FROM test-index | STATS count = COUNT(*)', [
          { name: 'host', type: 'keyword' },
          { name: 'error.code', type: 'keyword' },
          { name: 'count', type: 'number' },
        ])
      ).toEqual(['host', 'error.code', 'count']);
    });

    it('correctly gets the alertId from an ESQL query that uses STATS...BY', () => {
      expect(
        getAlertId('FROM test-index | STATS count = COUNT(*) BY error.code, host', [
          { name: 'host', type: 'keyword' },
          { name: 'error.code', type: 'keyword' },
          { name: 'count', type: 'number' },
        ])
      ).toEqual(['error.code', 'host']);
    });

    it('correctly gets the alertId from an ESQL query that uses STATS...BY and RENAME', () => {
      expect(
        getAlertId(
          'FROM test-index | STATS count = COUNT(*) BY error.code, host | RENAME error.code AS code, host AS h | RENAME code AS c',
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
        getAlertId(
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
        getAlertId('FROM test-index METADATA _id | KEEP host, _id', [
          { name: 'host', type: 'keyword' },
          { name: '_id', type: 'keyword' },
        ])
      ).toEqual(['_id']);
    });

    it('correctly gets the alertId from an ESQL query that uses METADATA _id and drops then drops the _id field', () => {
      expect(
        getAlertId('FROM test-index METADATA _id | KEEP host', [{ name: 'host', type: 'keyword' }])
      ).toEqual(['host']);
    });

    it('correctly gets the alertId from all columns', () => {
      expect(
        getAlertId('FROM test-index', [
          { name: 'host', type: 'keyword' },
          { name: 'error.code', type: 'keyword' },
          { name: 'ecs.version', type: 'keyword' },
        ])
      ).toEqual(['host', 'error.code', 'ecs.version']);
    });
  });
});
