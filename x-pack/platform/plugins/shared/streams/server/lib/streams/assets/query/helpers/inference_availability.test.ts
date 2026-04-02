/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { createInferenceResolver } from './inference_availability';

const EIS_ID = defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID;
const SELF_MANAGED_ID = defaultInferenceEndpoints.ELSER;

const createMockEsClient = (probeResponses: Record<string, 'ok' | 'fail'>): ElasticsearchClient => {
  return {
    inference: {
      inference: jest.fn(({ inference_id: id }: { inference_id: string }) => {
        if (probeResponses[id] === 'ok') {
          return Promise.resolve({ inference_results: [] });
        }
        return Promise.reject(new Error(`Inference endpoint "${id}" not available`));
      }),
    },
  } as unknown as ElasticsearchClient;
};

const PROBE_TRANSPORT = { requestTimeout: 5_000 };

const createMockLogger = () => loggerMock.create();

describe('createInferenceResolver', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the EIS endpoint when it is available', async () => {
    const logger = createMockLogger();
    const resolve = createInferenceResolver(logger);
    const esClient = createMockEsClient({ [EIS_ID]: 'ok', [SELF_MANAGED_ID]: 'ok' });

    const result = await resolve(esClient);

    expect(result).toEqual({ inferenceId: EIS_ID, available: true });
    expect(esClient.inference.inference).toHaveBeenCalledTimes(1);
    expect(esClient.inference.inference).toHaveBeenCalledWith(
      expect.objectContaining({ inference_id: EIS_ID, timeout: '3s' }),
      PROBE_TRANSPORT
    );
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(EIS_ID));
  });

  it('falls back to the self-managed endpoint when EIS is unavailable', async () => {
    const logger = createMockLogger();
    const resolve = createInferenceResolver(logger);
    const esClient = createMockEsClient({ [EIS_ID]: 'fail', [SELF_MANAGED_ID]: 'ok' });

    const result = await resolve(esClient);

    expect(result).toEqual({ inferenceId: SELF_MANAGED_ID, available: true });
    expect(esClient.inference.inference).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/Inference probe failed for ".+elser/)
    );
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(SELF_MANAGED_ID));
  });

  it('returns the preferred EIS ID with available: false when no endpoint works', async () => {
    const logger = createMockLogger();
    const resolve = createInferenceResolver(logger);
    const esClient = createMockEsClient({ [EIS_ID]: 'fail', [SELF_MANAGED_ID]: 'fail' });

    const result = await resolve(esClient);

    expect(result).toEqual({ inferenceId: EIS_ID, available: false });
    expect(esClient.inference.inference).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Inference probe failed for "${EIS_ID}"`)
    );
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Inference probe failed for "${SELF_MANAGED_ID}"`)
    );
    expect(logger.debug).toHaveBeenCalledWith('No ELSER inference endpoint available');
  });

  it('returns cached result on subsequent calls within TTL', async () => {
    const logger = createMockLogger();
    const resolve = createInferenceResolver(logger);
    const esClient = createMockEsClient({ [EIS_ID]: 'ok' });

    const first = await resolve(esClient);
    const second = await resolve(esClient);

    expect(first).toEqual(second);
    expect(esClient.inference.inference).toHaveBeenCalledTimes(1);
  });

  it('re-probes after the 5-minute TTL expires', async () => {
    const logger = createMockLogger();
    const resolve = createInferenceResolver(logger);
    const esClient = createMockEsClient({ [EIS_ID]: 'ok' });

    await resolve(esClient);
    expect(esClient.inference.inference).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5 * 60 * 1000 + 1);

    await resolve(esClient);
    expect(esClient.inference.inference).toHaveBeenCalledTimes(2);
  });

  it('caches negative results to avoid hammering endpoints', async () => {
    const logger = createMockLogger();
    const resolve = createInferenceResolver(logger);
    const esClient = createMockEsClient({ [EIS_ID]: 'fail', [SELF_MANAGED_ID]: 'fail' });

    const first = await resolve(esClient);
    expect(first.available).toBe(false);
    expect(esClient.inference.inference).toHaveBeenCalledTimes(2);

    const second = await resolve(esClient);
    expect(second.available).toBe(false);
    expect(esClient.inference.inference).toHaveBeenCalledTimes(2);
  });

  it('resolves on the first call without prior cache', async () => {
    const logger = createMockLogger();
    const resolve = createInferenceResolver(logger);
    const esClient = createMockEsClient({ [EIS_ID]: 'ok' });

    const result = await resolve(esClient);
    expect(result).toEqual({ inferenceId: EIS_ID, available: true });
  });

  it('reflects a change in availability after cache expires', async () => {
    const logger = createMockLogger();
    const resolve = createInferenceResolver(logger);
    const esClient = createMockEsClient({ [EIS_ID]: 'fail', [SELF_MANAGED_ID]: 'fail' });

    const first = await resolve(esClient);
    expect(first.available).toBe(false);

    (esClient.inference.inference as jest.Mock).mockImplementation(
      ({ inference_id: id }: { inference_id: string }) => {
        if (id === EIS_ID) return Promise.resolve({ inference_results: [] });
        return Promise.reject(new Error('not available'));
      }
    );

    jest.advanceTimersByTime(5 * 60 * 1000 + 1);

    const second = await resolve(esClient);
    expect(second).toEqual({ inferenceId: EIS_ID, available: true });
  });

  it('deduplicates concurrent calls after cache expiry', async () => {
    const logger = createMockLogger();
    const resolve = createInferenceResolver(logger);

    let probeResolve: (v: { inference_results: never[] }) => void;
    const esClient = {
      inference: {
        inference: jest.fn(
          () => new Promise<{ inference_results: never[] }>((r) => (probeResolve = r))
        ),
      },
    } as unknown as ElasticsearchClient;

    const p1 = resolve(esClient);
    const p2 = resolve(esClient);
    const p3 = resolve(esClient);

    expect(esClient.inference.inference).toHaveBeenCalledTimes(1);

    probeResolve!({ inference_results: [] });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toEqual({ inferenceId: EIS_ID, available: true });
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });

  it('isolates cache between separate resolver instances', async () => {
    const logger = createMockLogger();
    const resolverA = createInferenceResolver(logger);
    const resolverB = createInferenceResolver(logger);
    const esClient = createMockEsClient({ [EIS_ID]: 'ok' });

    await resolverA(esClient);
    await resolverB(esClient);

    expect(esClient.inference.inference).toHaveBeenCalledTimes(2);
  });
});
