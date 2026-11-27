/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { ESQLVariableType } from '@kbn/esql-types';
import { createEsqlControlColumnTypeResolver } from './esql_control_column_type_resolver';

const setup = (columns: Array<{ name: string; type: string }>) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.esql.query.mockResolvedValue({ columns, values: [] } as never);
  return { esClient, resolve: createEsqlControlColumnTypeResolver({ esClient }) };
};

describe('createEsqlControlColumnTypeResolver', () => {
  it('returns the type of the column the control query returns, without reading rows', async () => {
    const { esClient, resolve } = setup([{ name: 'bytes', type: 'long' }]);

    expect(await resolve({ query: 'FROM logs | STATS BY bytes', esqlVariables: [] })).toBe('long');
    expect(esClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM logs | STATS BY bytes | LIMIT 0',
        drop_null_columns: false,
      }),
      expect.anything()
    );
  });

  it('gives the query the values of the controls it uses', async () => {
    const { esClient, resolve } = setup([{ name: 'bytes', type: 'long' }]);

    await resolve({
      query: 'FROM logs | WHERE host == ?host | STATS BY bytes',
      esqlVariables: [
        { key: 'host', value: 'web-1', type: ESQLVariableType.VALUES },
        { key: 'other', value: 'x', type: ESQLVariableType.VALUES },
      ],
    });

    expect(esClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ params: [{ host: 'web-1' }] }),
      expect.anything()
    );
  });

  it('binds the time range of the dashboard to ?_tstart and ?_tend', async () => {
    const { esClient, resolve } = setup([{ name: 'bytes', type: 'long' }]);

    await resolve({
      query: 'FROM logs | WHERE @timestamp > ?_tstart AND @timestamp < ?_tend | STATS BY bytes',
      esqlVariables: [],
      timeRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
    });

    expect(esClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({
        params: [{ _tstart: '2026-01-01T00:00:00.000Z' }, { _tend: '2026-01-02T00:00:00.000Z' }],
      }),
      expect.anything()
    );
  });

  it('returns nothing when the query does not return exactly one column', async () => {
    const { resolve } = setup([
      { name: 'a', type: 'long' },
      { name: 'b', type: 'long' },
    ]);

    expect(await resolve({ query: 'FROM logs | KEEP a, b', esqlVariables: [] })).toBeUndefined();
  });
});
