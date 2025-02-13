/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { getAgentLogsTopErrors } from './agent_logs_top_errors';

describe('getAgentLogsTopErrors', () => {
  it('should return top 3 errors from 100 hits', async () => {
    const esClientMock = {
      search: jest.fn().mockImplementation((params) => {
        if (params.index === 'logs-elastic_agent-*')
          return {
            hits: {
              hits: [
                {
                  _source: {
                    message: 'error 2',
                  },
                },
                {
                  _source: {
                    message: 'error 2',
                  },
                },
                {
                  _source: {
                    message: 'error 3',
                  },
                },
                {
                  _source: {
                    message: 'error 3',
                  },
                },
                {
                  _source: {
                    message: 'error 3',
                  },
                },
                {
                  _source: {
                    message: 'error 1',
                  },
                },
              ],
            },
          };
        else
          return {
            hits: {
              hits: [
                {
                  _source: {
                    message: 'fleet server error 2',
                  },
                },
                {
                  _source: {
                    message: 'fleet server error 2',
                  },
                },
                {
                  _source: {
                    message: 'fleet server error 1',
                  },
                },
              ],
            },
          };
      }),
    } as unknown as ElasticsearchClient;

    const topErrors = await getAgentLogsTopErrors(esClientMock);
    expect(topErrors).toEqual({
      agent_logs_top_errors: ['error 3', 'error 2', 'error 1'],
      fleet_server_logs_top_errors: ['fleet server error 2', 'fleet server error 1'],
    });
  });
});
