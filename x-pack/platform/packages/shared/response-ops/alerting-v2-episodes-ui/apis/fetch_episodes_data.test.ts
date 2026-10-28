/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { buildEpisodesDataRequest } from '@kbn/alerting-v2-common-queries';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { fetchEpisodesData } from './fetch_episodes_data';

jest.mock('../utils/execute_esql_query');

const mockExecuteEsqlQuery = jest.mocked(executeEsqlQuery);
const mockExpressions = {} as ExpressionsStart;

describe('fetchEpisodesData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs the data request of the episodes with its filter', async () => {
    const mockRows = [{ 'episode.id': 'ep-1', episode_data: '{"host":"web-01"}' }];
    mockExecuteEsqlQuery.mockResolvedValue(mockRows);
    const abortController = new AbortController();

    const rows = await fetchEpisodesData({
      spaceId: 'default',
      episodeIds: ['ep-1', 'ep-2'],
      abortSignal: abortController.signal,
      expressions: mockExpressions,
    });

    expect(rows).toEqual(mockRows);
    const dataRequest = buildEpisodesDataRequest('default', ['ep-1', 'ep-2']);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: dataRequest.query.print('basic'),
      input: {
        type: 'kibana_context',
        filters: [expect.objectContaining({ query: dataRequest.filter })],
      },
      abortSignal: abortController.signal,
    });
  });
});
