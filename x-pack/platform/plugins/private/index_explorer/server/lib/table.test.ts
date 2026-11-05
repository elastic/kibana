/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { EsqlResponse, SearchRequestBody } from '../../common/types';
import { runEsql } from './esql';
import { displayColumns, findTimeField, getDocument, searchIndex } from './table';

jest.mock('./esql');

const runEsqlMock = jest.mocked(runEsql);

const INDEX = '.kibana-event-log-ds';
const FIELDS = {
  columns: [
    { name: '@timestamp', type: 'date' },
    { name: 'event.action', type: 'keyword' },
    { name: 'event.outcome', type: 'keyword' },
    { name: 'kibana.task.type', type: 'keyword' },
    { name: 'geo', type: 'unsupported' },
  ],
  values: [],
};

type QueryHandler = (query: string) => Pick<EsqlResponse, 'columns' | 'values'>;

function createClient(handler: QueryHandler) {
  runEsqlMock.mockReset();
  runEsqlMock.mockImplementation(async ({ body: { query } }) => ({
    isPartial: false,
    ...(query.endsWith('| LIMIT 0') ? FIELDS : handler(query)),
  }));
  return elasticsearchServiceMock.createElasticsearchClient();
}

describe('findTimeField', () => {
  it('prefers @timestamp, then the first date field', () => {
    expect(
      findTimeField([
        { name: 'a', type: 'date' },
        { name: '@timestamp', type: 'date_nanos' },
      ])
    ).toBe('@timestamp');
    expect(
      findTimeField([
        { name: 'x', type: 'keyword' },
        { name: 'event.start', type: 'date' },
      ])
    ).toBe('event.start');
    expect(findTimeField([{ name: 'x', type: 'keyword' }])).toBeUndefined();
  });
});

describe('displayColumns', () => {
  const columns = [
    { name: '_id', type: 'keyword' },
    { name: '_index', type: 'keyword' },
    { name: 'a', type: 'keyword' },
    { name: 'b', type: 'long' },
  ];

  it('follows the kept order, showing metadata only when kept', () => {
    expect(displayColumns(columns, ['b', '_id'])).toEqual([
      { name: 'b', type: 'long' },
      { name: '_id', type: 'keyword' },
    ]);
  });

  it('shows every data column when nothing is kept', () => {
    expect(displayColumns(columns, [])).toEqual([
      { name: 'a', type: 'keyword' },
      { name: 'b', type: 'long' },
    ]);
  });
});

describe('searchIndex', () => {
  const body: SearchRequestBody = {
    filters: [{ field: 'event.action', operator: 'exact', value: 'task-run' }],
    from: 1,
    size: 1,
    facets: ['event.outcome'],
    facetSize: 5,
    suggestFacets: true,
  };

  it('builds rows, total, facet and suggestion queries from the same filtered source', async () => {
    const esClient = createClient((query) => {
      if (query.includes('METADATA')) {
        return {
          columns: [
            { name: '@timestamp', type: 'date' },
            { name: '_id', type: 'keyword' },
            { name: '_index', type: 'keyword' },
            { name: 'event.outcome', type: 'keyword' },
            { name: 'kibana.task.type', type: 'keyword' },
          ],
          values: [
            ['2026-11-03T00:00:02Z', 'b', '.ds-1', 'success', 'alerting'],
            ['2026-11-03T00:00:01Z', 'a', '.ds-1', 'failure', 'actions'],
          ],
        };
      }
      if (query.includes('__total')) {
        return {
          columns: [
            { name: '__total', type: 'long' },
            { name: '__s0', type: 'long' },
            { name: '__s1', type: 'long' },
            { name: '__s2', type: 'long' },
          ],
          values: [[10, 1, 3, 4]],
        };
      }
      return {
        columns: [
          { name: '__count', type: 'long' },
          { name: 'event.outcome', type: 'keyword' },
        ],
        values: [
          [7, 'success'],
          [2, null],
        ],
      };
    });

    const result = await searchIndex({ esClient, index: INDEX, body });

    const queries = runEsqlMock.mock.calls.map(([{ body: request, dropNullColumns }]) => ({
      ...request,
      dropNullColumns,
    }));
    const params = [{ name: 'p0', type: 'string', value: 'task-run' }];
    const where = '| WHERE `event.action` == ?p0';
    const rowsQuery = `FROM ${INDEX} METADATA _id, _index\n${where}\n| SORT \`@timestamp\` DESC NULLS LAST\n| LIMIT 2\n| KEEP _id, _index, \`@timestamp\`, \`event.outcome\`, \`kibana.task.type\``;
    expect(queries).toEqual(
      expect.arrayContaining([
        {
          query: rowsQuery,
          params,
          dropNullColumns: false,
        },
        {
          query: `FROM ${INDEX}\n${where}\n| STATS __total = COUNT(*), __s0 = COUNT_DISTINCT(\`event.action\`), __s1 = COUNT_DISTINCT(\`event.outcome\`), __s2 = COUNT_DISTINCT(\`kibana.task.type\`)`,
          params,
        },
        {
          query: `FROM ${INDEX}\n${where}\n| STATS __count = COUNT(*) BY \`event.outcome\`\n| SORT __count DESC\n| LIMIT 5`,
          params,
        },
      ])
    );
    expect(result).toEqual({
      total: 10,
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'event.outcome', type: 'keyword' },
        { name: 'kibana.task.type', type: 'keyword' },
      ],
      rows: [
        {
          _id: 'a',
          _index: '.ds-1',
          values: {
            '@timestamp': '2026-11-03T00:00:01Z',
            'event.outcome': 'failure',
            'kibana.task.type': 'actions',
          },
        },
      ],
      facets: [
        {
          field: 'event.outcome',
          buckets: [{ value: 'success', label: 'success', count: 7 }],
          otherCount: 1,
        },
      ],
      suggestedFacets: [{ field: 'kibana.task.type', cardinality: 4 }],
      sort: { field: '@timestamp', direction: 'desc' },
      esql: {
        query: rowsQuery,
        params: [{ name: 'p0', type: 'string', value: 'task-run' }],
      },
    });
  });
});

describe('searchIndex column selection', () => {
  const body: SearchRequestBody = {
    filters: [],
    from: 0,
    size: 10,
    facets: [],
    facetSize: 5,
    suggestFacets: false,
  };

  function rowsRequest() {
    const call = runEsqlMock.mock.calls.find(([{ body: request }]) =>
      request.query.includes('METADATA')
    );
    return call?.[0];
  }

  it('KEEPs chosen columns in order, ignoring unknown names, and keeps null columns', async () => {
    const esClient = createClient(() => ({ columns: [], values: [] }));
    await searchIndex({
      esClient,
      index: INDEX,
      body: { ...body, columns: ['event.outcome', 'nope', '@timestamp'] },
    });

    expect(rowsRequest()?.body.query).toBe(
      `FROM ${INDEX} METADATA _id, _index\n| SORT \`@timestamp\` DESC NULLS LAST\n| LIMIT 10\n| KEEP _id, _index, \`event.outcome\`, \`@timestamp\``
    );
    expect(rowsRequest()?.dropNullColumns).toBe(false);
  });

  it('KEEPs requested metadata columns', async () => {
    const esClient = createClient(() => ({ columns: [], values: [] }));
    await searchIndex({ esClient, index: INDEX, body: { ...body, columns: ['_id', '_index'] } });

    expect(rowsRequest()?.body.query).toMatch(/\| KEEP _id, _index$/);
  });

  it('defaults to the time field and suggested facet fields, minus hidden columns', async () => {
    const esClient = createClient((query) =>
      query.includes('__total')
        ? { columns: [], values: [[10, 1, 3, 4]] }
        : { columns: [], values: [] }
    );
    await searchIndex({
      esClient,
      index: INDEX,
      body: { ...body, hiddenColumns: ['kibana.task.type'] },
    });

    expect(rowsRequest()?.body.query).toMatch(
      /\| KEEP _id, _index, `@timestamp`, `event\.outcome`$/
    );
  });

  it('uses configured metadata columns instead of computing defaults', async () => {
    const esClient = createClient(() => ({ columns: [], values: [] }));
    await searchIndex({
      esClient,
      index: INDEX,
      body,
      metadata: { facets: [], columns: ['event.action'] },
    });

    expect(rowsRequest()?.body.query).toMatch(/\| KEEP _id, _index, `event\.action`$/);
    expect(runEsqlMock.mock.calls[1][0].body.query).toBe(
      `FROM ${INDEX}\n| STATS __total = COUNT(*)`
    );
  });

  it('DROPs hidden columns when there is nothing to keep', async () => {
    const esClient = createClient(() => ({ columns: [], values: [] }));
    await searchIndex({
      esClient,
      index: INDEX,
      body: { ...body, hiddenColumns: ['@timestamp', 'kibana.task.type'] },
    });

    expect(rowsRequest()?.body.query).toMatch(/\| DROP `@timestamp`, `kibana\.task\.type`$/);
    expect(rowsRequest()?.dropNullColumns).toBe(true);
  });
});

describe('getDocument', () => {
  it('fetches a document by _id including _source', async () => {
    const esClient = createClient(() => ({
      columns: [
        { name: '_id', type: 'keyword' },
        { name: '_index', type: 'keyword' },
        { name: '_source', type: '_source' },
        { name: 'event.action', type: 'keyword' },
      ],
      values: [['a', '.ds-1', { event: { action: 'task-run' } }, 'task-run']],
    }));

    expect(await getDocument({ esClient, index: INDEX, id: 'a' })).toEqual({
      _id: 'a',
      _index: '.ds-1',
      values: { 'event.action': 'task-run' },
      source: { event: { action: 'task-run' } },
      esql: {
        query: `FROM ${INDEX} METADATA _id, _index, _source\n| WHERE _id == ?id\n| LIMIT 1`,
        params: [{ name: 'id', type: 'string', value: 'a' }],
      },
    });
  });

  it('returns undefined when there is no match', async () => {
    const esClient = createClient(() => ({ columns: [], values: [] }));
    expect(await getDocument({ esClient, index: INDEX, id: 'nope' })).toBeUndefined();
  });
});
