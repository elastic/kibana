/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLVariableType } from '@kbn/esql-types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { PAGE_SIZE_ESQL_VARIABLE } from '../constants';
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
});
