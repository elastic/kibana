/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from '../../database';
import exampleFilter from './example_filter.json';
import monitorState from './monitor_states_docs.json';
import { ElasticsearchMonitorStatesAdapter } from '../elasticsearch_monitor_states_adapter';
import { get, set } from 'lodash';
import { assertCloseTo } from '../../../helper';

describe('ElasticsearchMonitorStatesAdapter', () => {
  let database: DatabaseAdapter;
  let searchMock: jest.Mock<Promise<any>, [any, any]>;
  beforeAll(() => {
    database = {
      count: jest.fn(async (request: any, params: any): Promise<any> => 0),
      search: jest.fn(async (request: any, params: any): Promise<any> => {}),
      head: jest.fn(async (request: any, params: any): Promise<any> => {}),
    };
  });

  beforeEach(() => {
    searchMock = jest.fn(async (request: any, params: any): Promise<any> => monitorState);
    database.search = searchMock;
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('returns properly formatted objects from raw es documents', async () => {
    expect.assertions(1);
    const adapter = new ElasticsearchMonitorStatesAdapter(database);
    const result = await adapter.legacyGetMonitorStates({}, 'now-15m', 'now');
    expect(result).toMatchSnapshot();
  });

  it('applies an appropriate filter section to the query based on filters', async () => {
    expect.assertions(3);
    const adapter = new ElasticsearchMonitorStatesAdapter(database);
    await adapter.legacyGetMonitorStates(
      {},
      'now-15m',
      'now',
      JSON.stringify(exampleFilter),
      'down'
    );
    expect(searchMock).toHaveBeenCalledTimes(3);
    const fixedInterval = parseInt(
      get(
        searchMock.mock.calls[2][1],
        'body.aggs.by_id.aggs.histogram.date_histogram.fixed_interval',
        ''
      ).split('ms')[0],
      10
    );
    expect(fixedInterval).not.toBeNaN();
    /**
     * This value can sometimes be off by 1 as a result of fuzzy calculation.
     *
     * It had no implications in practice, but from a test standpoint can cause flaky
     * snapshot failures.
     */
    assertCloseTo(fixedInterval, 36000, 100);
    set(
      searchMock.mock.calls[2][1],
      'body.aggs.by_id.aggs.histogram.date_histogram.fixed_interval',
      '36000ms'
    );
    expect(searchMock.mock.calls).toMatchSnapshot();
  });
});
