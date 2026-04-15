/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLVariableType } from '@kbn/esql-types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { PAGE_SIZE_ESQL_VARIABLE } from '../constants';
import { buildRelatedAlertEpisodesEsqlQuery } from '../queries/related_episodes_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { fetchRelatedAlertEpisodes } from './fetch_related_alert_episodes';

jest.mock('../utils/execute_esql_query');

const mockExecuteEsqlQuery = jest.mocked(executeEsqlQuery);

describe('fetchRelatedAlertEpisodes', () => {
  const mockExpressions = {} as ExpressionsStart;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteEsqlQuery.mockResolvedValue([]);
  });

  it('calls executeEsqlQuery with the related-episodes ES|QL and page size variable', async () => {
    const pageSize = 5;
    const ruleId = 'rule-1';
    const excludeEpisodeId = 'ep-current';
    const expectedQuery = buildRelatedAlertEpisodesEsqlQuery(ruleId, excludeEpisodeId).print(
      'basic'
    );

    await fetchRelatedAlertEpisodes({
      pageSize,
      ruleId,
      excludeEpisodeId,
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
    const ruleId = 'r';
    const excludeEpisodeId = 'e';
    const expectedQuery = buildRelatedAlertEpisodesEsqlQuery(ruleId, excludeEpisodeId).print(
      'basic'
    );

    await fetchRelatedAlertEpisodes({
      pageSize: 3,
      ruleId,
      excludeEpisodeId,
      abortSignal: abortController.signal,
      services: { expressions: mockExpressions },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expectedQuery,
        abortSignal: abortController.signal,
      })
    );
  });
});
