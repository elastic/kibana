/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolsStart } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { createFeatureSimilaritySearch } from './agent_builder_feature_similarity_search';

const args = {
  candidate_id: 'okta-sdk',
  title: 'Okta SDK',
  description: 'Okta client technology',
  type: 'technology',
};

describe('createFeatureSimilaritySearch', () => {
  const request = {} as KibanaRequest;
  const logger = loggerMock.create();

  it('executes the registered Agent Builder tool with stream context', async () => {
    const execute = jest.fn().mockResolvedValue({
      results: [
        {
          type: ToolResultType.other,
          data: {
            features: [
              {
                id: 'okta',
                title: 'Okta',
                description: 'Identity provider',
                confidence: 90,
              },
            ],
            count: 1,
          },
        },
      ],
    });
    const search = createFeatureSimilaritySearch({
      agentBuilderTools: { execute } as unknown as ToolsStart,
      request,
      kiClient: { findFeatures: jest.fn() },
      streamName: 'logs.test',
      logger,
    });

    await expect(search(args)).resolves.toEqual([
      {
        id: 'okta',
        title: 'Okta',
        description: 'Identity provider',
        confidence: 90,
      },
    ]);
    expect(execute).toHaveBeenCalledWith({
      toolId: 'platform.sig_events.ki_feature_similarity_search',
      toolParams: { stream_name: 'logs.test', ...args },
      request,
    });
  });

  it('falls back to direct semantic search when Agent Builder execution is unavailable', async () => {
    const findFeatures = jest.fn().mockResolvedValue({
      hits: [
        {
          id: 'okta',
          type: 'technology',
          title: 'Okta',
          description: 'Identity provider',
          confidence: 90,
        },
      ],
    });
    const search = createFeatureSimilaritySearch({
      agentBuilderTools: {
        execute: jest.fn().mockRejectedValue(new Error('tool unavailable')),
      } as unknown as ToolsStart,
      request,
      kiClient: { findFeatures } as never,
      streamName: 'logs.test',
      logger,
    });

    await expect(search(args)).resolves.toEqual([
      {
        id: 'okta',
        title: 'Okta',
        description: 'Identity provider',
        confidence: 90,
      },
    ]);
    expect(findFeatures).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('using direct search'));
  });

  it('propagates registered tool errors without repeating the backend search', async () => {
    const findFeatures = jest.fn();
    const search = createFeatureSimilaritySearch({
      agentBuilderTools: {
        execute: jest.fn().mockResolvedValue({
          results: [
            {
              type: ToolResultType.error,
              data: { message: 'semantic unavailable' },
            },
          ],
        }),
      } as unknown as ToolsStart,
      request,
      kiClient: { findFeatures } as never,
      streamName: 'logs.test',
      logger,
    });

    await expect(search(args)).rejects.toThrow('semantic unavailable');
    expect(findFeatures).not.toHaveBeenCalled();
  });
});
