/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from '../../database';
import monitorState from './monitor_states_docs.json';
import { ElasticsearchMonitorStatesAdapter } from '../elasticsearch_monitor_states_adapter';

describe('ElasticsearchMonitorStatesAdapter', () => {
  let database: DatabaseAdapter;
  beforeAll(() => {
    database = {
      count: jest.fn(async (request: any, params: any): Promise<any> => 0),
      search: jest.fn(async (request: any, params: any): Promise<any> => {}),
      head: jest.fn(async (request: any, params: any): Promise<any> => {}),
    };
  });

  it('returns properly formatted objects from raw es documents', async () => {
    expect.assertions(1);
    database.search = jest.fn(async (request: any, params: any): Promise<any> => monitorState);
    const adapter = new ElasticsearchMonitorStatesAdapter(database);
    const result = await adapter.legacyGetMonitorStates({}, 'now-15m', 'now');
    expect(result).toMatchSnapshot();
  });
});
