/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getErrorSource, TaskErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { executeEsqlRequest } from './execute_esql_request';

describe('executeEsqlRequest', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  const esqlRequest = {
    query: 'FROM logs-* | WHERE host.name == "test"',
    filter: { match_all: {} },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns parsed results when the query succeeds', async () => {
    esClient.esql.query.mockResolvedValueOnce({
      columns: [
        { name: '_source', type: 'object' },
        { name: '_id', type: 'keyword' },
      ],
      values: [[{ host: { name: 'test' } }, 'doc-1']],
    } as never);

    const results = await executeEsqlRequest({ esClient, esqlRequest, logger });

    expect(results).toEqual([{ _id: 'doc-1', _source: { host: { name: 'test' } } }]);
  });

  it('returns an empty array when _source or _id columns are missing', async () => {
    esClient.esql.query.mockResolvedValueOnce({
      columns: [{ name: 'host.name', type: 'keyword' }],
      values: [['test']],
    } as never);

    const results = await executeEsqlRequest({ esClient, esqlRequest, logger });

    expect(results).toEqual([]);
  });

  it('throws a user error when the ES|QL query fails', async () => {
    esClient.esql.query.mockRejectedValueOnce(
      new Error('verification_exception: Unknown index [logs.kafka]')
    );

    try {
      await executeEsqlRequest({ esClient, esqlRequest, logger });
      fail('Expected executeEsqlRequest to throw');
    } catch (e) {
      const error = e as Error;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Error executing ES|QL request');
      expect(error.message).toContain('verification_exception');
      expect(getErrorSource(error)).toBe(TaskErrorSource.USER);
    }
  });

  it('logs the error message at debug level', async () => {
    esClient.esql.query.mockRejectedValueOnce(new Error('some query error'));

    await expect(executeEsqlRequest({ esClient, esqlRequest, logger })).rejects.toThrow();

    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Error executing ES|QL request: some query error')
    );
  });
});
