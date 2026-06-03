/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFeature } from '@kbn/streams-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createFeatureKnowledgeIndicatorToolHandler } from './handler';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-feature-uuid'),
}));

describe('createFeatureKnowledgeIndicatorToolHandler', () => {
  const logger = loggingSystemMock.createLogger();

  const featureInput: Omit<BaseFeature, 'stream_name'> = {
    id: 'feature-1',
    type: 'custom',
    description: 'Feature description',
    properties: { field: 'value' },
    confidence: 85,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and stores feature KI with server-managed fields', async () => {
    const featureClient = {
      bulk: jest.fn().mockResolvedValue({ applied: 1, skipped: 0 }),
    };

    const result = await createFeatureKnowledgeIndicatorToolHandler({
      featureClient: featureClient as never,
      streamName: 'logs.test',
      featureInput,
      logger,
    });

    expect(result).toEqual({ id: 'feature-1', uuid: 'generated-feature-uuid' });
    expect(featureClient.bulk).toHaveBeenCalledTimes(1);

    const [streamNameArg, operationsArg] = featureClient.bulk.mock.calls[0];
    expect(streamNameArg).toBe('logs.test');
    expect(operationsArg).toHaveLength(1);
    expect(operationsArg[0].index.feature).toEqual(
      expect.objectContaining({
        ...featureInput,
        stream_name: 'logs.test',
        uuid: 'generated-feature-uuid',
        status: 'active',
      })
    );
    expect(typeof operationsArg[0].index.feature.last_seen).toBe('string');
  });

  it('throws when feature storage fails', async () => {
    const featureClient = {
      bulk: jest.fn().mockRejectedValue(new Error('bulk failed')),
    };

    await expect(
      createFeatureKnowledgeIndicatorToolHandler({
        featureClient: featureClient as never,
        streamName: 'logs.test',
        featureInput,
        logger,
      })
    ).rejects.toThrow('bulk failed');
  });
});
