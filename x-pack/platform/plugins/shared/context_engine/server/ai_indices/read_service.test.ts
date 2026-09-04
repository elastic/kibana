/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/core-security-server';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import { AiIndexReadService } from './read_service';

describe('AiIndexReadService', () => {
  const esqlQuery = jest.fn();
  const esClient = { esql: { query: esqlQuery } } as unknown as ElasticsearchClient;
  const auditLogger = { log: jest.fn() } as unknown as jest.Mocked<AuditLogger>;
  const service = new AiIndexReadService({ esClient, spaceId: 'marketing', auditLogger });

  beforeEach(() => {
    esqlQuery.mockReset();
    auditLogger.log.mockReset();
  });

  describe('query', () => {
    it('runs the query in the service space and audits success', async () => {
      esqlQuery.mockResolvedValue({ columns: [], values: [] });

      const result = await service.query({ query: 'FROM ai-index-idx-a', limit: 10 });

      expect(result).toEqual({ columns: [], values: [] });
      expect(esqlQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'FROM ai-index-idx-a | LIMIT 10',
          filter: buildAiIndexSpaceFilter('marketing'),
        }),
        expect.anything()
      );
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User has queried an AI index',
          event: expect.objectContaining({ action: 'ai_index_query', outcome: 'success' }),
        })
      );
    });

    it('audits failure and rethrows', async () => {
      esqlQuery.mockRejectedValue(new Error('boom'));

      await expect(service.query({ query: 'FROM ai-index-idx-a' })).rejects.toThrow('boom');

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed attempt to query an AI index',
          event: expect.objectContaining({ action: 'ai_index_query', outcome: 'failure' }),
          error: { code: 'Error', message: 'boom' },
        })
      );
    });
  });
});
