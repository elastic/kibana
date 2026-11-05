/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { ESQLVariableType } from '@kbn/esql-types';
import { toQueryContext, toTemplateData } from './custom_template';

describe('toQueryContext', () => {
  it('splits the time params from the variables and drops unset values', () => {
    expect(
      toQueryContext({
        _tstart: '2026-11-01T00:00:00.000Z',
        _tend: '2026-11-02T00:00:00.000Z',
        os: 'linux',
        min_bytes: 100,
        country: null,
      })
    ).toEqual({
      timeRange: { from: '2026-11-01T00:00:00.000Z', to: '2026-11-02T00:00:00.000Z' },
      esqlVariables: [
        { key: 'os', value: 'linux', type: ESQLVariableType.VALUES },
        { key: 'min_bytes', value: 100, type: ESQLVariableType.VALUES },
      ],
    });
  });

  it('leaves out the time range when the query had none', () => {
    expect(toQueryContext()).toEqual({ timeRange: undefined, esqlVariables: [] });
  });
});

describe('toTemplateData', () => {
  it('orders row values by column and prefers the Elasticsearch type', () => {
    const table: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'host', name: 'host', meta: { type: 'string', esType: 'keyword' } },
        { id: 'count', name: 'count', meta: { type: 'number' } },
      ],
      rows: [
        { count: 3, host: 'a' },
        { host: 'b', count: 5 },
      ],
    };

    expect(toTemplateData(table)).toEqual({
      columns: [
        { name: 'host', type: 'keyword' },
        { name: 'count', type: 'number' },
      ],
      rows: [
        ['a', 3],
        ['b', 5],
      ],
    });
  });
});
