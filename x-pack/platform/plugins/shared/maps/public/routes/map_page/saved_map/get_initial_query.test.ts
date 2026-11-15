/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const getDefaultQueryMock = jest.fn();

jest.mock('../../../kibana_services', () => ({
  getData: () => ({
    query: {
      queryString: {
        getDefaultQuery: getDefaultQueryMock,
      },
    },
  }),
}));

import { getInitialQuery } from './get_initial_query';
import type { MapAttributes } from '../../../../server';

const DEFAULT_QUERY = { language: 'kuery', query: '' };
const MAP_QUERY = { language: 'kuery', query: 'machine.os.raw : "ios"' };
const APP_STATE_QUERY = { language: 'kuery', query: 'machine.os.raw : "win 8"' };

describe('getInitialQuery', () => {
  beforeEach(() => {
    getDefaultQueryMock.mockReturnValue(DEFAULT_QUERY);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return query from mapState when no appState query is set', () => {
    const mapState = { query: MAP_QUERY } as unknown as MapAttributes;
    const result = getInitialQuery({ mapState, appState: {} });
    expect(result).toEqual(MAP_QUERY);
  });

  it('should return appState query over query stored in map', () => {
    const mapState = { query: MAP_QUERY } as unknown as MapAttributes;
    const result = getInitialQuery({ mapState, appState: { query: APP_STATE_QUERY } });
    expect(result).toEqual(APP_STATE_QUERY);
  });

  it('should return default query when neither mapState nor appState has a query', () => {
    const result = getInitialQuery({ mapState: undefined, appState: {} });
    expect(result).toEqual(DEFAULT_QUERY);
  });
});
