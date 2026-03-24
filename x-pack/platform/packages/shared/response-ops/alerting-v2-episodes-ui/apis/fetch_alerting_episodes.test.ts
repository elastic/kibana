/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLVariableType } from '@kbn/esql-types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { buildEpisodesPaginatedQuery } from '../utils/build_episodes_esql_query';
import { fetchAlertingEpisodes } from './fetch_alerting_episodes';

jest.mock('../utils/execute_esql_query');
jest.mock('../utils/build_episodes_filters');

const executeEsqlQueryMock = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;

describe('fetchAlertingEpisodes', () => {
  const mockExpressions = {} as ExpressionsStart;
  const mockDataView = {
    getFieldByName: jest.fn(),
  } as unknown as DataView;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call executeEsqlQuery with correct parameters for first page', () => {
    const pageSize = 10;
    const expectedQuery = buildEpisodesPaginatedQuery({
      sortField: '@timestamp',
      sortDirection: 'desc',
    });

    fetchAlertingEpisodes({
      pageSize,
      services: { expressions: mockExpressions },
      dataView: mockDataView,
    });

    expect(executeEsqlQueryMock).toHaveBeenCalledTimes(1);
    expect(executeEsqlQueryMock).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'lastEpisodeTimestamp',
            value: null,
            type: ESQLVariableType.VALUES,
          },
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

  it('should call executeEsqlQuery with correct parameters when beforeTimestamp is provided', () => {
    const pageSize = 20;
    const beforeTimestamp = '2024-01-15T10:30:00.000Z';
    const expectedQuery = buildEpisodesPaginatedQuery({
      sortField: '@timestamp',
      sortDirection: 'desc',
    });

    fetchAlertingEpisodes({
      pageSize,
      beforeTimestamp,
      services: { expressions: mockExpressions },
      dataView: mockDataView,
    });

    expect(executeEsqlQueryMock).toHaveBeenCalledTimes(1);
    expect(executeEsqlQueryMock).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'lastEpisodeTimestamp',
            value: beforeTimestamp,
            type: ESQLVariableType.VALUES,
          },
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
    const expectedQuery = buildEpisodesPaginatedQuery({
      sortField: '@timestamp',
      sortDirection: 'desc',
    });

    fetchAlertingEpisodes({
      pageSize,
      abortSignal,
      services: { expressions: mockExpressions },
      dataView: mockDataView,
    });

    expect(executeEsqlQueryMock).toHaveBeenCalledTimes(1);
    expect(executeEsqlQueryMock).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'lastEpisodeTimestamp',
            value: null,
            type: ESQLVariableType.VALUES,
          },
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

  it('should call executeEsqlQuery with all parameters provided', () => {
    const pageSize = 25;
    const beforeTimestamp = '2024-02-20T15:45:30.000Z';
    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    const expectedQuery = buildEpisodesPaginatedQuery({
      sortField: '@timestamp',
      sortDirection: 'desc',
    });

    fetchAlertingEpisodes({
      pageSize,
      beforeTimestamp,
      abortSignal,
      services: { expressions: mockExpressions },
      dataView: mockDataView,
    });

    expect(executeEsqlQueryMock).toHaveBeenCalledTimes(1);
    expect(executeEsqlQueryMock).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'lastEpisodeTimestamp',
            value: beforeTimestamp,
            type: ESQLVariableType.VALUES,
          },
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
});
