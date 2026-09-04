/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import {
  createGetStreamFeaturesTool,
  SIGNIFICANT_EVENTS_GET_STREAM_FEATURES_TOOL_ID,
} from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

describe('ki_stream_features_get tool', () => {
  const logger = loggingSystemMock.createLogger();
  const server = {} as StreamsServer;
  const getFeatures = jest.fn();
  const getScopedClients = jest.fn(async () => {
    return {
      licensing: {},
      streamsClient: { getStream: jest.fn().mockResolvedValue({ name: 'logs.test' }) },
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ getFeatures }),
    } as unknown as RouteHandlerScopedClients;
  }) as unknown as jest.MockedFunction<GetScopedClients>;

  beforeEach(() => {
    jest.clearAllMocks();
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    getFeatures.mockResolvedValue({
      hits: [
        {
          id: 'feature-1',
          run_id: 'run-1',
          stream_name: 'logs.test',
          type: 'entity',
          title: 'Checkout',
          description: 'Checkout service',
          confidence: 95,
          properties: { service: 'checkout' },
        },
      ],
    });
  });

  const createTool = () =>
    createGetStreamFeaturesTool({
      getScopedClients,
      server,
      logger,
    });

  it('is a bounded read-only Agent Builder tool', () => {
    const tool = createTool();
    if (!('schema' in tool)) {
      throw new Error('Expected a schema-backed tool registration');
    }

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_GET_STREAM_FEATURES_TOOL_ID);
    expect(tool.id).toBe('platform.sig_events.ki_stream_features_get');
    expect(tool.annotations).toEqual(
      expect.objectContaining({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      })
    );
    expect(tool.schema.safeParse({ stream_name: 'logs.test', limit: 100 }).success).toBe(true);
    expect(tool.schema.safeParse({ stream_name: 'logs.test', limit: 101 }).success).toBe(false);
  });

  it('loads and compacts stream features', async () => {
    const result = await invokeHandler(
      createTool(),
      {
        stream_name: 'logs.test',
        feature_types: ['entity'],
        min_confidence: 70,
        limit: 25,
      },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(getFeatures).toHaveBeenCalledWith('logs.test', {
      type: ['entity'],
      minConfidence: 70,
      limit: 25,
      excludedType: ['log_samples'],
    });
    expect(result.results).toEqual([
      {
        type: 'other',
        data: {
          count: 1,
          features: [
            expect.objectContaining({
              id: 'feature-1',
              type: 'entity',
              title: 'Checkout',
            }),
          ],
        },
      },
    ]);
    expect(result.results[0].data.features[0]).not.toHaveProperty('run_id');
    expect(result.results[0].data.features[0]).not.toHaveProperty('stream_name');
  });

  it('returns an Agent Builder error result', async () => {
    getFeatures.mockRejectedValueOnce(new Error('feature lookup failed'));

    const result = await invokeHandler(
      createTool(),
      { stream_name: 'logs.test' },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(result.results).toEqual([{ type: 'error', data: { message: 'feature lookup failed' } }]);
  });
});
