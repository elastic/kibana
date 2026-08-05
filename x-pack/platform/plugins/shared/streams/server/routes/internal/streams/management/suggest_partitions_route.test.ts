/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { partitionStream } from '@kbn/streams-ai';
import type { Streams } from '@kbn/streams-schema';
import { STREAMS_TIERED_ML_FEATURE } from '../../../../../common';
import { suggestPartitionsRoute } from './suggest_partitions_route';

jest.mock('@kbn/streams-ai', () => ({
  partitionStream: jest.fn(),
}));

const route = suggestPartitionsRoute['POST /internal/streams/{name}/_suggest_partitions'];

type HandlerParams = Parameters<typeof route.handler>[0];

const wiredStream: Streams.WiredStream.Definition = {
  type: 'wired',
  name: 'logs.service',
  description: '',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    wired: {
      fields: {},
      routing: [],
    },
    failure_store: { inherit: {} },
  },
};

const callHandler = async ({
  getKnowledgeIndicatorClient,
}: {
  getKnowledgeIndicatorClient?: () => Promise<{
    getFeatures: jest.Mock;
  }>;
}) => {
  const getScopedClients = jest.fn().mockResolvedValue({
    inferenceClient: { bindTo: jest.fn().mockReturnValue({}) },
    scopedClusterClient: { asCurrentUser: {} },
    streamsClient: { getStream: jest.fn().mockResolvedValue(wiredStream) },
    getKnowledgeIndicatorClient,
  });

  const handlerParams = {
    params: {
      path: { name: wiredStream.name },
      body: {
        connector_id: 'connector-1',
        start: 0,
        end: 1,
      },
    },
    request: {
      events: {
        aborted$: { subscribe: jest.fn() },
      },
    },
    getScopedClients,
    server: {
      core: {
        pricing: {
          isFeatureAvailable: jest.fn().mockImplementation((id: string) => {
            return id === STREAMS_TIERED_ML_FEATURE.id;
          }),
        },
      },
    },
    telemetry: {
      startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
      reportStreamsStateError: jest.fn(),
    },
    logger: { debug: jest.fn(), error: jest.fn() },
  } as unknown as HandlerParams;

  return route.handler(handlerParams);
};

describe('suggest_partitions route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty features when the KI client is unavailable', async () => {
    let capturedGetFeatures: ((filters?: unknown) => Promise<unknown>) | undefined;
    (partitionStream as jest.Mock).mockImplementation(async (options) => {
      capturedGetFeatures = options.getFeatures;
      return { partitions: [] };
    });

    const result = await callHandler({});
    await firstValueFrom(result);

    expect(capturedGetFeatures).toBeDefined();
    await expect(capturedGetFeatures?.({})).resolves.toEqual([]);
  });

  it('loads features from the KI client when available', async () => {
    const getFeatures = jest.fn().mockResolvedValue({ hits: [{ name: 'feature-a' }] });
    let capturedGetFeatures: ((filters?: unknown) => Promise<unknown>) | undefined;
    (partitionStream as jest.Mock).mockImplementation(async (options) => {
      capturedGetFeatures = options.getFeatures;
      return { partitions: [] };
    });

    const result = await callHandler({
      getKnowledgeIndicatorClient: async () => ({ getFeatures }),
    });
    await firstValueFrom(result);

    await expect(capturedGetFeatures?.({})).resolves.toEqual([{ name: 'feature-a' }]);
    expect(getFeatures).toHaveBeenCalledWith(wiredStream.name, {});
  });
});
