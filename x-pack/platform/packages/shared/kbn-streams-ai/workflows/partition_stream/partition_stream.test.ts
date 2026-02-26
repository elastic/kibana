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

  const mockEsClient = {} as ElasticsearchClient;
  const mockInferenceClient = {} as BoundInferenceClient;
  const mockSignal = new AbortController().signal;
  const mockGetFeatures = jest.fn().mockResolvedValue([]);

  const createMockDefinition = (
    routing: Streams.WiredStream.Definition['ingest']['wired']['routing'] = []
  ): Streams.WiredStream.Definition => ({
    name: 'logs.test',
    ingest: {
      lifecycle: { dsl: {} },
      processing: { steps: [] },
      wired: {
        routing,
        fields: {},
        failure_store: { enabled: false },
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

    it('should return no_samples when clusters have zero samples, child conditions exist, but no samples without exclusion either', async () => {
      const definition = createMockDefinition([
        {
          destination: 'logs.test.child',
          where: { field: 'service.name', eq: 'api' },
          status: 'enabled',
        },
      ]);

      mockClusterLogs
        .mockResolvedValueOnce([
          {
            name: 'Uncategorized logs',
            condition: { always: {} },
            clustering: { sampled: 0, noise: [], clusters: [] },
          },
        ])
        .mockResolvedValueOnce([
          {
            name: 'Uncategorized logs',
            condition: { always: {} },
            clustering: { sampled: 0, noise: [], clusters: [] },
          },
        ]);

      const result = await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(result).toEqual({
        partitions: [],
        reason: 'no_samples',
      });
      expect(mockClusterLogs).toHaveBeenCalledTimes(2);
      expect(mockClusterLogs).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          excludeConditions: [{ field: 'service.name', eq: 'api' }],
        })
      );
      expect(mockClusterLogs).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          excludeConditions: [],
        })
      );
      expect(mockExecuteAsReasoningAgent).not.toHaveBeenCalled();
    });
  });

  describe('reason: all_data_partitioned', () => {
    it('should return all_data_partitioned when clusters have zero samples with exclusions but have samples without exclusions', async () => {
      const definition = createMockDefinition([
        {
          destination: 'logs.test.child',
          where: { field: 'service.name', eq: 'api' },
          status: 'enabled',
        },
      ]);

      mockClusterLogs
        .mockResolvedValueOnce([
          {
            name: 'Uncategorized logs',
            condition: { always: {} },
            clustering: { sampled: 0, noise: [], clusters: [] },
          },
        ])
        .mockResolvedValueOnce([
          {
            name: 'Uncategorized logs',
            condition: { always: {} },
            clustering: { sampled: 100, noise: [], clusters: [] },
          },
        ]);

      const result = await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(result).toEqual({
        partitions: [],
        reason: 'all_data_partitioned',
      });
      expect(mockClusterLogs).toHaveBeenCalledTimes(2);
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

      mockClusterLogs
        .mockResolvedValueOnce([
          {
            name: 'Uncategorized logs',
            condition: { always: {} },
            clustering: { sampled: 0, noise: [], clusters: [] },
          },
        ])
        .mockResolvedValueOnce([
          {
            name: 'Uncategorized logs',
            condition: { always: {} },
            clustering: { sampled: 50, noise: [], clusters: [] },
          },
        ]);

      const result = await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(result).toEqual({
        partitions: [],
        reason: 'all_data_partitioned',
      });

      expect(mockClusterLogs).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          excludeConditions: [{ field: 'service.name', eq: 'api' }],
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
            clusters: [{ count: 50, analysis: { message: 'cluster 1' } }],
          },
        },
      ]);

      mockExecuteAsReasoningAgent.mockResolvedValueOnce({
        toolCalls: [
          {
            function: {
              name: 'partition_logs',
              arguments: {
                index: 'logs.test',
                partitions: [{ name: 'api-logs', condition: { field: 'service.name', eq: 'api' } }],
              },
            },
          },
        ],
      });

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
            clusters: [{ count: 50, analysis: { message: 'cluster 1' } }],
          },
        },
      ]);

      mockExecuteAsReasoningAgent.mockResolvedValueOnce({
        toolCalls: [
          {
            function: {
              name: 'partition_logs',
              arguments: {
                index: 'logs.test',
                partitions: [],
              },
            },
          },
        ],
      });

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
            clusters: [{ count: 50, analysis: { message: 'cluster 1' } }],
          },
        },
      ]);

      mockExecuteAsReasoningAgent.mockResolvedValueOnce({
        toolCalls: [
          {
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
      });

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
            clusters: [{ count: 50, analysis: { message: 'cluster 1' } }],
          },
        },
      ]);

      mockExecuteAsReasoningAgent.mockResolvedValueOnce({
        toolCalls: [
          {
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
      });

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

      let capturedToolCallback:
        | ((args: { function: { arguments: unknown } }) => Promise<unknown>)
        | null = null;

      mockClusterLogs.mockResolvedValue([
        {
          name: 'Uncategorized logs',
          condition: { always: {} },
          clustering: {
            sampled: 100,
            noise: [],
            clusters: [{ count: 50, analysis: { message: 'cluster 1' } }],
          },
        },
      ]);

      mockExecuteAsReasoningAgent.mockImplementation(async ({ toolCallbacks }) => {
        capturedToolCallback = toolCallbacks.partition_logs;
        return {
          toolCalls: [
            {
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
      });

      await partitionStream({
        ...defaultParams,
        definition,
      });

      expect(capturedToolCallback).toBeDefined();

      mockClusterLogs.mockClear();
      mockClusterLogs.mockResolvedValueOnce([]);

      await capturedToolCallback!({
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
