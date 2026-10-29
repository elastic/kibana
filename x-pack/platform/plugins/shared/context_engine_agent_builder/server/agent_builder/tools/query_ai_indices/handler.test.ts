/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { CONTEXT_ENGINE_READ_DENIED_MESSAGE } from '../ai_index_read_service';
import { createAiIndexToolDepsMock } from '../ai_index_read_service.mock';
import { kiIdsOf, queryAiIndicesHandler } from './handler';

describe('queryAiIndicesHandler', () => {
  const context = {
    esClient: elasticsearchServiceMock.createScopedClusterClient(),
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'space-1',
    logger: loggingSystemMock.createLogger(),
  };
  const columns = [{ name: 'title', type: 'keyword' }];
  const values = [['Runbook A']];

  it('passes the request through to the read service unchanged', async () => {
    const { deps, readService } = createAiIndexToolDepsMock();
    readService.query.mockResolvedValue({ columns, values });
    const request = {
      query: 'FROM ai-index-runbooks | WHERE type == ?kind | LIMIT 5',
      params: { kind: 'dashboard' },
      limit: 5,
    };

    const result = await queryAiIndicesHandler({ deps, request, context });

    expect(readService.query).toHaveBeenCalledWith(request);
    expect(result).toEqual({ columns, values });
  });

  it('counts a read of every KI the query returns', async () => {
    const { deps, readService, kiUsageService } = createAiIndexToolDepsMock();
    readService.query.mockResolvedValue({
      columns: [
        { name: 'id', type: 'keyword' },
        { name: 'title', type: 'text' },
      ],
      values: [
        ['memory/entity/customer/acme', 'Acme'],
        [null, 'Untitled'],
      ],
    });

    await queryAiIndicesHandler({ deps, request: { query: 'FROM ai-index-*' }, context });
    await new Promise(process.nextTick);

    expect(kiUsageService.recordAccess).toHaveBeenCalledWith({
      spaceId: 'space-1',
      kiIds: ['memory/entity/customer/acme'],
    });
  });

  it('counts nothing when the query drops the id column', async () => {
    const { deps, readService, kiUsageService } = createAiIndexToolDepsMock();
    readService.query.mockResolvedValue({ columns, values });

    await queryAiIndicesHandler({ deps, request: { query: 'FROM ai-index-*' }, context });
    await new Promise(process.nextTick);

    expect(kiUsageService.recordAccess).not.toHaveBeenCalled();
  });

  it('returns the rows when counting the reads fails', async () => {
    const { deps, readService, kiUsageService } = createAiIndexToolDepsMock();
    const response = { columns: [{ name: 'id', type: 'keyword' }], values: [['ki-1']] };
    readService.query.mockResolvedValue(response);
    kiUsageService.recordAccess.mockRejectedValue(new Error('index unavailable'));

    await expect(
      queryAiIndicesHandler({ deps, request: { query: 'FROM ai-index-*' }, context })
    ).resolves.toEqual(response);
    await new Promise(process.nextTick);

    expect(context.logger.debug).toHaveBeenCalledWith(
      'Failed to record KI reads: index unavailable'
    );
  });

  it('fails closed without the read privilege', async () => {
    const { deps, readService } = createAiIndexToolDepsMock({ authorized: false });

    await expect(
      queryAiIndicesHandler({ deps, request: { query: 'FROM ai-index-*' }, context })
    ).rejects.toThrow(CONTEXT_ENGINE_READ_DENIED_MESSAGE);
    expect(readService.query).not.toHaveBeenCalled();
  });
});

describe('kiIdsOf', () => {
  it('takes the string ids from the id column, wherever it is', () => {
    expect(
      kiIdsOf({
        columns: [
          { name: 'title', type: 'text' },
          { name: 'id', type: 'keyword' },
        ],
        values: [
          ['A', 'ki-a'],
          ['B', ''],
          ['C', null],
          ['D', 'ki-d'],
        ],
      })
    ).toEqual(['ki-a', 'ki-d']);
  });
});
