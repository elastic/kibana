/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLVariableType } from '@kbn/esql-types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { buildEpisodesQuery } from '../utils/build_episodes_esql_query';
import { fetchAlertingEpisodes } from './fetch_alerting_episodes';

jest.mock('../utils/execute_esql_query');

const mockExecuteEsqlQuery = jest.mocked(executeEsqlQuery);

describe('fetchAlertingEpisodes', () => {
  const mockExpressions = {} as ExpressionsStart;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call executeEsqlQuery with correct parameters', () => {
    const pageSize = 10;
    const expectedQuery = buildEpisodesQuery({
      sortField: '@timestamp',
      sortDirection: 'desc',
    }).print('basic');

    fetchAlertingEpisodes({
      pageSize,
      services: { expressions: mockExpressions },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'pageSize',
            value: pageSize,
            type: ESQLVariableType.VALUES,
          },
        ],
      },
      abortSignal: undefined,
    });
  });

  it('should call executeEsqlQuery with different page size', () => {
    const pageSize = 20;
    const expectedQuery = buildEpisodesQuery({
      sortField: '@timestamp',
      sortDirection: 'desc',
    }).print('basic');

    fetchAlertingEpisodes({
      pageSize,
      services: { expressions: mockExpressions },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'pageSize',
            value: pageSize,
            type: ESQLVariableType.VALUES,
          },
        ],
      },
      abortSignal: undefined,
    });
  });

  it('should call executeEsqlQuery with abort signal when provided', () => {
    const pageSize = 15;
    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    const expectedQuery = buildEpisodesQuery({
      sortField: '@timestamp',
      sortDirection: 'desc',
    }).print('basic');

    fetchAlertingEpisodes({
      pageSize,
      abortSignal,
      services: { expressions: mockExpressions },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'pageSize',
            value: pageSize,
            type: ESQLVariableType.VALUES,
          },
        ],
      },
      abortSignal,
    });
  });

  it('should call executeEsqlQuery with custom sort parameters', () => {
    const pageSize = 25;
    const sortState = {
      sortField: 'episode.status',
      sortDirection: 'asc' as const,
    };
    const expectedQuery = buildEpisodesQuery(sortState).print('basic');

    fetchAlertingEpisodes({
      pageSize,
      sortState,
      services: { expressions: mockExpressions },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'pageSize',
            value: pageSize,
            type: ESQLVariableType.VALUES,
          },
        ],
      },
      abortSignal: undefined,
    });
  });
});
