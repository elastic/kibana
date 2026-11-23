/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import type { EsWorkflowExecution } from '@kbn/workflows';
import type { WorkflowExecutionsDataClient } from '@kbn/workflows-execution-engine/server';
import { createMockWorkflowDataClient } from '@kbn/workflows-execution-engine/server/mocks';
import {
  searchWorkflowExecutions,
  WORKFLOW_EXECUTION_LIST_SOURCE_INCLUDES,
} from './search_workflow_executions';

describe('searchWorkflowExecutions', () => {
  let mockWorkflowDataClient: jest.Mocked<WorkflowExecutionsDataClient>;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    mockWorkflowDataClient = createMockWorkflowDataClient();

    mockLogger = loggerMock.create();
    mockLogger.error = jest.fn();
  });

  describe('response transformation', () => {
    it('should include execution names and concurrencyGroupKey in list results when present', async () => {
      mockWorkflowDataClient.search.mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'exec-1',
              _source: {
                spaceId: 'default',
                status: 'completed',
                error: null,
                isTestRun: false,
                startedAt: '2024-01-01T00:00:00Z',
                finishedAt: '2024-01-01T00:00:03Z',
                duration: 3000,
                workflowId: 'workflow-1',
                runName: 'Report for October',
                workflowDefinition: {
                  name: 'Example Workflow',
                  tags: ['reporting'],
                },
                managed: true,
                triggeredBy: 'manual',
                executedBy: 'elastic',
                concurrencyGroupKey: 'streams-ki-onboarding-my-stream',
              },
            },
          ],
        },
      } as any);

      const result = await searchWorkflowExecutions({
        workflowExecutionsDataClient: mockWorkflowDataClient,
        logger: mockLogger,
        query: { term: { workflowId: 'workflow-1' } },
        page: 1,
        size: 20,
      });

      expect(result.results[0]).toEqual(
        expect.objectContaining({
          id: 'exec-1',
          workflowName: 'Example Workflow',
          runName: 'Report for October',
          tags: ['reporting'],
          managed: true,
          concurrencyGroupKey: 'streams-ki-onboarding-my-stream',
        })
      );
    });

    it('should include version in list results when present', async () => {
      mockWorkflowDataClient.search.mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'exec-1',
              _source: {
                spaceId: 'default',
                status: 'completed',
                error: null,
                isTestRun: false,
                startedAt: '2024-01-01T00:00:00Z',
                finishedAt: '2024-01-01T00:00:03Z',
                duration: 3000,
                workflowId: 'workflow-1',
                triggeredBy: 'manual',
                executedBy: 'elastic',
                version: 3,
              },
            },
          ],
        },
      } as any);

      const result = await searchWorkflowExecutions({
        workflowExecutionsDataClient: mockWorkflowDataClient,
        logger: mockLogger,
        query: { term: { workflowId: 'workflow-1' } },
        page: 1,
        size: 20,
      });

      expect(result.results[0]).toEqual(
        expect.objectContaining({
          id: 'exec-1',
          version: 3,
        })
      );
    });

    it('should omit version from list results when absent', async () => {
      mockWorkflowDataClient.search.mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'exec-legacy',
              _source: {
                spaceId: 'default',
                status: 'completed',
                error: null,
                isTestRun: false,
                startedAt: '2024-01-01T00:00:00Z',
                finishedAt: '2024-01-01T00:00:03Z',
                duration: 3000,
                workflowId: 'workflow-1',
                triggeredBy: 'manual',
                executedBy: 'elastic',
              },
            },
          ],
        },
      } as any);

      const result = await searchWorkflowExecutions({
        workflowExecutionsDataClient: mockWorkflowDataClient,
        logger: mockLogger,
        query: { term: { workflowId: 'workflow-1' } },
        page: 1,
        size: 20,
      });

      expect(result.results[0]).not.toHaveProperty('version');
    });
  });

  describe('search options', () => {
    it('should sort by createdAt then mapped id, not _id', async () => {
      mockWorkflowDataClient.search.mockResolvedValue({
        hits: {
          total: { value: 0 },
          hits: [],
        },
      } as any);

      await searchWorkflowExecutions({
        workflowExecutionsDataClient: mockWorkflowDataClient,
        logger: mockLogger,
        query: { term: { workflowId: 'workflow-1' } },
      });

      expect(mockWorkflowDataClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ createdAt: 'desc' }, { id: 'desc' }],
        })
      );
    });

    it('should request only list metadata fields from Elasticsearch', async () => {
      mockWorkflowDataClient.search.mockResolvedValue({
        hits: {
          total: { value: 0 },
          hits: [],
        },
      } as any);

      await searchWorkflowExecutions({
        workflowExecutionsDataClient: mockWorkflowDataClient,
        logger: mockLogger,
        query: { term: { workflowId: 'workflow-1' } },
      });

      expect(mockWorkflowDataClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: { includes: [...WORKFLOW_EXECUTION_LIST_SOURCE_INCLUDES] },
        })
      );
    });

    it('uses offsets and omits the cursor when results are collapsed', async () => {
      mockWorkflowDataClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 4, relation: 'eq' },
          hits: [
            {
              _index: '.workflows-executions',
              _id: 'exec-1',
              _source: { spaceId: 'default', workflowId: 'workflow-1' } as EsWorkflowExecution,
              sort: ['2026-11-23T12:00:00.000Z', 'exec-1'],
            },
          ],
        },
      });

      const result = await searchWorkflowExecutions({
        workflowExecutionsDataClient: mockWorkflowDataClient,
        logger: mockLogger,
        query: { term: { workflowId: 'workflow-1' } },
        collapse: { field: 'concurrencyGroupKey' },
        page: 2,
        size: 1,
        from: 1,
      });

      expect(mockWorkflowDataClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          collapse: { field: 'concurrencyGroupKey' },
          from: 1,
        })
      );
      expect(result.results).toHaveLength(1);
      expect(result).not.toHaveProperty('searchAfter');
    });
  });

  describe('error handling', () => {
    it('should not log error when index_not_found_exception occurs (expected behavior)', async () => {
      mockLogger.error.mockClear();
      const indexNotFoundError = new errors.ResponseError({
        statusCode: 404,
        body: {
          error: {
            type: 'index_not_found_exception',
            reason: 'no such index [.workflows-executions]',
          },
        },
        headers: {},
        meta: {} as any,
        warnings: [],
      });

      mockWorkflowDataClient.search.mockRejectedValue(indexNotFoundError);

      const result = await searchWorkflowExecutions({
        workflowExecutionsDataClient: mockWorkflowDataClient,
        logger: mockLogger,
        query: { term: { workflowId: 'workflow-1' } },
        page: 1,
        size: 20,
      });

      expect(result).toEqual({
        results: [],
        size: 20,
        page: 1,
        total: 0,
      });

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log error and throw when non-index_not_found_exception errors occur', async () => {
      mockLogger.error.mockClear();
      const otherError = new errors.ResponseError({
        statusCode: 500,
        body: {
          error: {
            type: 'internal_server_error',
            reason: 'Internal server error',
          },
        },
        headers: {},
        meta: {} as any,
        warnings: [],
      });

      mockWorkflowDataClient.search.mockRejectedValue(otherError);

      await expect(
        searchWorkflowExecutions({
          workflowExecutionsDataClient: mockWorkflowDataClient,
          logger: mockLogger,
          query: { term: { workflowId: 'workflow-1' } },
        })
      ).rejects.toThrow(otherError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to search workflow executions')
      );
    });

    it('rethrows result window errors unchanged so the route maps them to a sanitized 400', async () => {
      const resultWindowError = new errors.ResponseError({
        statusCode: 400,
        body: {
          error: {
            type: 'search_phase_execution_exception',
            reason:
              'Result window is too large, from + size must be less than or equal to: [10000]',
          },
        },
        headers: {},
        meta: {} as any,
        warnings: [],
      });

      mockWorkflowDataClient.search.mockRejectedValue(resultWindowError);

      await expect(
        searchWorkflowExecutions({
          workflowExecutionsDataClient: mockWorkflowDataClient,
          logger: mockLogger,
          query: { term: { workflowId: 'workflow-1' } },
          page: 101,
          size: 100,
        })
      ).rejects.toBe(resultWindowError);
    });

    it('should log error and throw for non-ResponseError exceptions', async () => {
      mockLogger.error.mockClear();
      const genericError = new Error('Network error');

      mockWorkflowDataClient.search.mockRejectedValue(genericError);

      await expect(
        searchWorkflowExecutions({
          workflowExecutionsDataClient: mockWorkflowDataClient,
          logger: mockLogger,
          query: { term: { workflowId: 'workflow-1' } },
        })
      ).rejects.toThrow('Network error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to search workflow executions')
      );
    });
  });
});
