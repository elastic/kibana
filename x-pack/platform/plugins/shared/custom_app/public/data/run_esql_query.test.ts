/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchContext } from '@kbn/presentation-publishing';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import { getNamedParams } from '@kbn/esql-utils';
import { fetchEsqlData } from '@kbn/custom-content-renderer';
import { createRunEsqlQuery } from './run_esql_query';

jest.mock('@kbn/custom-content-renderer', () => ({ fetchEsqlData: jest.fn() }));

const search = jest.fn();
const http = {};
const signal = new AbortController().signal;
const QUERY = 'FROM logs | WHERE service == ?service';

const dashboardVariable = (key: string, value: string): ESQLControlVariable => ({
  key,
  value,
  type: ESQLVariableType.VALUES,
});

const run = (context: Partial<FetchContext>, state: Record<string, string | number | boolean>) =>
  createRunEsqlQuery({ search, http } as never)(
    QUERY,
    { context: context as FetchContext, state },
    signal
  );

const lastCall = () => {
  const [, , query, timeRange, abortSignal, options] = (fetchEsqlData as jest.Mock).mock.calls[0];
  return { query, timeRange, abortSignal, options };
};

describe('createRunEsqlQuery', () => {
  beforeEach(() => {
    (fetchEsqlData as jest.Mock).mockReset().mockResolvedValue({
      columns: [{ name: 'value', type: 'long' }],
      values: [[1]],
    });
  });

  it('passes the query and the whole fetch context through, and maps the response', async () => {
    const context = {
      timeRange: { from: 'now-1h', to: 'now' },
      filters: [{ meta: {} }],
      query: { language: 'kuery', query: 'a:b' },
      projectRouting: '_alias:*',
      isApproximate: true,
    } as unknown as Partial<FetchContext>;

    const data = await run(context, {});

    const { query, timeRange, abortSignal, options } = lastCall();
    expect(query).toBe(QUERY);
    expect(timeRange).toBe(context.timeRange);
    expect(abortSignal).toBe(signal);
    expect(options).toMatchObject({
      isApproximate: true,
      projectRouting: '_alias:*',
      query: context.query,
      filters: context.filters,
    });
    expect(data).toEqual({ columns: [{ name: 'value', type: 'long' }], rows: [[1]] });
  });

  it('offers state values, including booleans and numbers, as parameters', async () => {
    await run({}, { service: 'checkout', limit: 5, compact: true });

    expect(lastCall().options.esqlVariables).toEqual([
      expect.objectContaining({ key: 'service', value: 'checkout' }),
      expect.objectContaining({ key: 'limit', value: 5 }),
      expect.objectContaining({ key: 'compact', value: true }),
    ]);
  });

  it('keeps dashboard variables the state does not shadow, and lets state win otherwise', async () => {
    await run(
      {
        esqlVariables: [dashboardVariable('env', 'prod'), dashboardVariable('service', 'ignored')],
      },
      { service: 'checkout' }
    );

    expect(lastCall().options.esqlVariables).toEqual([
      expect.objectContaining({ key: 'env', value: 'prod' }),
      expect.objectContaining({ key: 'service', value: 'checkout' }),
    ]);
  });

  it.each([
    "x' OR 1=1 --",
    '"; DROP INDEX logs; //',
    '?? | DROP logs',
    '${service}',
    '{{state.service}}',
    'a\nFROM secrets',
    'x'.repeat(1000),
  ])('never lets the state value %p change the query text', async (hostile) => {
    await run({}, { service: hostile });

    const { query, options } = lastCall();
    expect(query).toBe(QUERY);

    // What would reach Elasticsearch: the query is unchanged and the value is a named parameter.
    expect(getNamedParams(query, undefined, options.esqlVariables)).toEqual([{ service: hostile }]);
  });
});
