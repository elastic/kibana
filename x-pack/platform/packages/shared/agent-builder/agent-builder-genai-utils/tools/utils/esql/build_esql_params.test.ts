/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLVariableType } from '@kbn/esql-types';
import { buildEsqlParams } from './build_esql_params';

const timeRange = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' };
const esqlVariables = [
  { key: 'host', value: 'web-1', type: ESQLVariableType.VALUES },
  { key: 'unused', value: 'nope', type: ESQLVariableType.VALUES },
];

describe('buildEsqlParams', () => {
  it('sends the time range as it always has when there are no control values', () => {
    expect(buildEsqlParams({ query: 'FROM logs', timeRange })).toEqual([
      { _tstart: '2026-01-01T00:00:00.000Z' },
      { _tend: '2026-01-02T00:00:00.000Z' },
    ]);
  });

  it('adds the values of the controls the query uses, after the time range', () => {
    expect(
      buildEsqlParams({
        query: 'FROM logs | WHERE host.name == ?host',
        timeRange,
        esqlVariables,
      })
    ).toEqual([
      { _tstart: '2026-01-01T00:00:00.000Z' },
      { _tend: '2026-01-02T00:00:00.000Z' },
      { host: 'web-1' },
    ]);
  });

  it('sends only the values the query uses', () => {
    const params = buildEsqlParams({
      query: 'FROM logs | STATS n = COUNT(*)',
      timeRange,
      esqlVariables,
    });
    expect(params).toHaveLength(2);
  });

  it('returns undefined when there is nothing to bind', () => {
    expect(buildEsqlParams({ query: 'FROM logs' })).toBeUndefined();
    expect(buildEsqlParams({ query: 'FROM logs', esqlVariables: [] })).toBeUndefined();
    expect(buildEsqlParams({ query: 'FROM logs', esqlVariables })).toBeUndefined();
  });
});
