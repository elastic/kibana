/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLVariableType } from '@kbn/esql-types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { buildEpisodesDataRequest, PAGE_SIZE_ESQL_VARIABLE } from '@kbn/alerting-v2-common-queries';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { fetchRelatedEpisodes } from './fetch_related_episodes';

jest.mock('../utils/execute_esql_query');

const mockExecuteEsqlQuery = jest.mocked(executeEsqlQuery);

describe('fetchRelatedEpisodes', () => {
  const mockExpressions = {} as ExpressionsStart;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteEsqlQuery.mockResolvedValue([]);
  });

  it('calls executeEsqlQuery with the given query and page size variable', async () => {
    const pageSize = 5;
    const query = 'FROM alert_episodes | WHERE true';

    await fetchRelatedEpisodes({
      spaceId: 'default',
      pageSize,
      query,
      expressions: mockExpressions,
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: PAGE_SIZE_ESQL_VARIABLE,
            value: pageSize,
            type: ESQLVariableType.VALUES,
          },
        ],
      },
      abortSignal: undefined,
    });
  });

  it('passes abortSignal when provided', async () => {
    const abortController = new AbortController();
    const query = 'FROM alert_episodes | LIMIT 0';

    await fetchRelatedEpisodes({
      spaceId: 'default',
      pageSize: 3,
      query,
      abortSignal: abortController.signal,
      expressions: mockExpressions,
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query,
        abortSignal: abortController.signal,
      })
    );
  });

  it('skips the data query when there are no related episodes', async () => {
    await fetchRelatedEpisodes({
      spaceId: 'default',
      pageSize: 5,
      query: 'FROM .rule-events',
      expressions: mockExpressions,
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
  });

  it('adds the latest data of the related episodes with the data filter', async () => {
    mockExecuteEsqlQuery
      .mockResolvedValueOnce([{ 'episode.id': 'ep-1' }, { 'episode.id': 'ep-2' }])
      .mockResolvedValueOnce([{ 'episode.id': 'ep-1', episode_data: '{"host":"web-01"}' }]);

    const episodes = await fetchRelatedEpisodes({
      spaceId: 'default',
      pageSize: 5,
      query: 'FROM .rule-events',
      expressions: mockExpressions,
    });

    expect(episodes).toEqual([
      { 'episode.id': 'ep-1', episode_data: '{"host":"web-01"}' },
      { 'episode.id': 'ep-2', episode_data: null },
    ]);

    const dataRequest = buildEpisodesDataRequest('default', ['ep-1', 'ep-2']);
    expect(mockExecuteEsqlQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: dataRequest.query.print('basic'),
        input: {
          type: 'kibana_context',
          filters: [expect.objectContaining({ query: dataRequest.filter })],
        },
      })
    );
  });
});
