/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Streams } from '@kbn/streams-schema';
import { partitionStream } from '.';

jest.mock('../../src/cluster_logs/cluster_logs', () => ({
  clusterLogs: jest.fn(),
}));

jest.mock('@kbn/inference-prompt-utils', () => ({
  executeAsReasoningAgent: jest.fn(),
}));

import { clusterLogs } from '../../src/cluster_logs/cluster_logs';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';

const mockClusterLogs = clusterLogs as jest.MockedFunction<typeof clusterLogs>;
const mockExecuteAsReasoningAgent = executeAsReasoningAgent as jest.MockedFunction<
  typeof executeAsReasoningAgent
>;

describe('partitionStream', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const mockEsClient = {
    count: jest.fn(),
  } as unknown as ElasticsearchClient;
  const mockInferenceClient = {} as BoundInferenceClient;
  const mockSignal = new AbortController().signal;
  const mockGetFeatures = jest.fn().mockResolvedValue([]);

  const createMockDefinition = (
    routing: Streams.WiredStream.Definition['ingest']['wired']['routing'] = []
  ): Streams.WiredStream.Definition => ({
    name: 'logs.test',
    description: 'Test stream',
    updated_at: '2024-01-01T00:00:00Z',
    ingest: {
      lifecycle: { dsl: {} },
      processing: { steps: [], updated_at: '2024-01-01T00:00:00Z' },
      settings: {},
      failure_store: { disabled: {} },
      wired: {
        routing,
        fields: {},
      },
    },
  });

  const defaultParams = {
    esClient: mockEsClient,
    inferenceClient: mockInferenceClient,
    logger: mockLogger,
    start: 1000,
    end: 2000,
    signal: mockSignal,
    getFeatures: mockGetFeatures,
  };

  const createMockAnalysis = () => ({
    total: 100,
    sampled: 50,
    fields: { message: ['test log message'] },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reason: no_clusters', () => {
    it('should return no_clusters when clusterLogs returns empty array', async () => {
      mockClusterLogs.mockResolvedValueOnce([]);

      const result = await partitionStream({
        ...defaultParams,
        definition: createMockDefinition(),
      });

      expect(result).toEqual({
        partitions: [],
        reason: 'no_clusters',
      });
      expect(mockClusterLogs).toHaveBeenCalledTimes(1);
      expect(mockExecuteAsReasoningAgent).not.toHaveBeenCalled();
    });
  });

  describe('reason: no_samples', () => {
    it('should return no_samples when all clusters have zero samples and no child conditions', async () => {
      mockClusterLogs.mockResolvedValueOnce([
        {
          name: 'Uncategorized logs',
          condition: { always: {} },
          clustering: { sampled: 0, noise: [], clusters: [] },
        },
      ]);

      const result = await partitionStream({
        ...defaultParams,
        definition: createMockDefinition(),
      });

      expect(result).toEqual({
        partitions: [],
        reason: 'no_samples',
      });
      expect(mockClusterLogs).toHaveBeenCalledTimes(1);
      expect(mockExecuteAsReasoningAgent).not.toHaveBeenCalled();
    });

    it('should return no_samples when clusters have zero samples, child conditions exist, but no docs without exclusion either', async () => {
      const definition = createMockDefinition([
        {
          destination: 'logs.test.child',
          where: { field: 'service.name', eq: 'api' },
          status: 'enabled',
        },
      ]);

      mockClusterLogs.mockResolvedValueOnce([
        {
          name: 'Uncategorized logs',
          condition: { always: {} },
          clustering: { sampled: 0, noise: [], clusters: [] },
        },
      ]);

      (mockEsClient.count as jest.Mock).mockResolvedValueOnce({ count: 0 });

      const result = await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(result).toEqual({
        partitions: [],
        reason: 'no_samples',
      });
      expect(mockClusterLogs).toHaveBeenCalledTimes(1);
      expect(mockClusterLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeConditions: [{ field: 'service.name', eq: 'api' }],
        })
      );
      expect(mockEsClient.count).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'logs.test',
        })
      );
      expect(mockExecuteAsReasoningAgent).not.toHaveBeenCalled();
    });
  });

  describe('reason: all_data_partitioned', () => {
    it('should return all_data_partitioned when clusters have zero samples with exclusions but docs exist without exclusions', async () => {
      const definition = createMockDefinition([
        {
          destination: 'logs.test.child',
          where: { field: 'service.name', eq: 'api' },
          status: 'enabled',
        },
      ]);

      mockClusterLogs.mockResolvedValueOnce([
        {
          name: 'Uncategorized logs',
          condition: { always: {} },
          clustering: { sampled: 0, noise: [], clusters: [] },
        },
      ]);

      (mockEsClient.count as jest.Mock).mockResolvedValueOnce({ count: 100 });

      const result = await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(result).toEqual({
        partitions: [],
        reason: 'all_data_partitioned',
      });
      expect(mockClusterLogs).toHaveBeenCalledTimes(1);
      expect(mockEsClient.count).toHaveBeenCalledTimes(1);
      expect(mockExecuteAsReasoningAgent).not.toHaveBeenCalled();
    });

    it('should skip disabled routing rules when determining excludeConditions', async () => {
      const definition = createMockDefinition([
        {
          destination: 'logs.test.child-enabled',
          where: { field: 'service.name', eq: 'api' },
          status: 'enabled',
        },
        {
          destination: 'logs.test.child-disabled',
          where: { field: 'service.name', eq: 'disabled-service' },
          status: 'disabled',
        },
      ]);

      mockClusterLogs.mockResolvedValueOnce([
        {
          name: 'Uncategorized logs',
          condition: { always: {} },
          clustering: { sampled: 0, noise: [], clusters: [] },
        },
      ]);

      (mockEsClient.count as jest.Mock).mockResolvedValueOnce({ count: 50 });

      const result = await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(result).toEqual({
        partitions: [],
        reason: 'all_data_partitioned',
      });

      expect(mockClusterLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeConditions: [{ field: 'service.name', eq: 'api' }],
        })
      );
    });

    it('should handle not conditions in excludeConditions', async () => {
      const definition = createMockDefinition([
        {
          destination: 'logs.test.child-with-not',
          where: { not: { field: 'cloud.availability_zone', eq: 'us-east-1a' } },
          status: 'enabled',
        },
      ]);

      mockClusterLogs.mockResolvedValueOnce([
        {
          name: 'Uncategorized logs',
          condition: { always: {} },
          clustering: { sampled: 0, noise: [], clusters: [] },
        },
      ]);

      (mockEsClient.count as jest.Mock).mockResolvedValueOnce({ count: 100 });

      const result = await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(result).toEqual({
        partitions: [],
        reason: 'all_data_partitioned',
      });

      expect(mockClusterLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeConditions: [{ not: { field: 'cloud.availability_zone', eq: 'us-east-1a' } }],
        })
      );
    });
  });

  describe('LLM reasoning path', () => {
    it('should call executeAsReasoningAgent when clusters have samples', async () => {
      const definition = createMockDefinition();

      mockClusterLogs.mockResolvedValueOnce([
        {
          name: 'Uncategorized logs',
          condition: { always: {} },
          clustering: {
            sampled: 100,
            noise: [],
            clusters: [{ count: 50, analysis: createMockAnalysis() }],
          },
        },
      ]);

      mockExecuteAsReasoningAgent.mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            toolCallId: 'call-1',
            function: {
              name: 'partition_logs',
              arguments: {
                index: 'logs.test',
                partitions: [{ name: 'api-logs', condition: { field: 'service.name', eq: 'api' } }],
              },
            },
          },
        ],
      } as any);

      const result = await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(result.partitions).toHaveLength(1);
      expect(result.partitions[0].name).toBe('logs.test.api-logs');
      expect(result.reason).toBeUndefined();
      expect(mockExecuteAsReasoningAgent).toHaveBeenCalledTimes(1);
    });

    it('should return no_clusters when LLM returns empty partitions', async () => {
      const definition = createMockDefinition();

      mockClusterLogs.mockResolvedValueOnce([
        {
          name: 'Uncategorized logs',
          condition: { always: {} },
          clustering: {
            sampled: 100,
            noise: [],
            clusters: [{ count: 50, analysis: createMockAnalysis() }],
          },
        },
      ]);

      mockExecuteAsReasoningAgent.mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            toolCallId: 'call-1',
            function: {
              name: 'partition_logs',
              arguments: {
                index: 'logs.test',
                partitions: [],
              },
            },
          },
        ],
      } as any);

      const result = await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(result).toEqual({
        partitions: [],
        reason: 'no_clusters',
      });
    });

    it('should filter out invalid conditions (always: {})', async () => {
      const definition = createMockDefinition();

      mockClusterLogs.mockResolvedValueOnce([
        {
          name: 'Uncategorized logs',
          condition: { always: {} },
          clustering: {
            sampled: 100,
            noise: [],
            clusters: [{ count: 50, analysis: createMockAnalysis() }],
          },
        },
      ]);

      mockExecuteAsReasoningAgent.mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            toolCallId: 'call-1',
            function: {
              name: 'partition_logs',
              arguments: {
                index: 'logs.test',
                partitions: [
                  { name: 'all-logs', condition: { always: {} } },
                  { name: 'api-logs', condition: { field: 'service.name', eq: 'api' } },
                ],
              },
            },
          },
        ],
      } as any);

      const result = await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(result.partitions).toHaveLength(1);
      expect(result.partitions[0].name).toBe('logs.test.api-logs');
    });

    it('should sanitize partition names', async () => {
      const definition = createMockDefinition();

      mockClusterLogs.mockResolvedValueOnce([
        {
          name: 'Uncategorized logs',
          condition: { always: {} },
          clustering: {
            sampled: 100,
            noise: [],
            clusters: [{ count: 50, analysis: createMockAnalysis() }],
          },
        },
      ]);

      mockExecuteAsReasoningAgent.mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            toolCallId: 'call-1',
            function: {
              name: 'partition_logs',
              arguments: {
                index: 'logs.test',
                partitions: [
                  { name: 'API Service Logs', condition: { field: 'service.name', eq: 'api' } },
                  { name: '--invalid--name--', condition: { field: 'service.name', eq: 'test' } },
                ],
              },
            },
          },
        ],
      } as any);

      const result = await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(result.partitions).toHaveLength(2);
      expect(result.partitions[0].name).toBe('logs.test.api-service-logs');
      expect(result.partitions[1].name).toBe('logs.test.invalid-name');
    });

    it('should pass excludeConditions to partition_logs tool callback', async () => {
      const definition = createMockDefinition([
        {
          destination: 'logs.test.existing-child',
          where: { field: 'service.name', eq: 'existing' },
          status: 'enabled',
        },
      ]);

      let capturedToolCallback: ((args: any) => Promise<unknown>) | null = null;

      mockClusterLogs.mockResolvedValue([
        {
          name: 'Uncategorized logs',
          condition: { always: {} },
          clustering: {
            sampled: 100,
            noise: [],
            clusters: [{ count: 50, analysis: createMockAnalysis() }],
          },
        },
      ]);

      mockExecuteAsReasoningAgent.mockImplementation((async ({ toolCallbacks }: any) => {
        capturedToolCallback = toolCallbacks.partition_logs;
        return {
          content: '',
          toolCalls: [
            {
              toolCallId: 'call-1',
              function: {
                name: 'partition_logs',
                arguments: {
                  index: 'logs.test',
                  partitions: [],
                },
              },
            },
          ],
        };
      }) as any);

      await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(capturedToolCallback).toBeDefined();

      mockClusterLogs.mockClear();
      mockClusterLogs.mockResolvedValueOnce([]);

      await capturedToolCallback!({
        toolCallId: 'test-call',
        function: {
          arguments: {
            index: 'logs.test',
            partitions: [{ name: 'new-partition', condition: { field: 'level', eq: 'error' } }],
          },
        },
      });

      expect(mockClusterLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeConditions: [{ field: 'service.name', eq: 'existing' }],
          partitions: [{ name: 'new-partition', condition: { field: 'level', eq: 'error' } }],
        })
      );
    });
  });
});
