/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { awaitTraceReady } from './trace_readiness';
import * as chatEvidenceModule from './chat_evidence';
import type { TraceAccessor } from './types';

jest.mock('./chat_evidence');

describe('awaitTraceReady', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';
  const logger = loggingSystemMock.createLogger();
  const traceAccessor: TraceAccessor = {
    traceId,
    esClient: {} as TraceAccessor['esClient'],
  };
  const extractChatEvidenceMock = chatEvidenceModule.extractChatEvidence as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const flushRetries = async () => {
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(15000);
      await Promise.resolve();
    }
  };

  it('resolves immediately when agent response is present', async () => {
    extractChatEvidenceMock.mockResolvedValueOnce({
      user_query: 'hello',
      agent_response: 'world',
    });

    const promise = awaitTraceReady(traceAccessor, logger);
    await flushRetries();
    await expect(promise).resolves.toBeUndefined();
    expect(extractChatEvidenceMock).toHaveBeenCalledTimes(1);
  });

  it('retries when agent response is empty and succeeds on subsequent attempt', async () => {
    extractChatEvidenceMock
      .mockResolvedValueOnce({ user_query: 'hello', agent_response: '' })
      .mockResolvedValueOnce({ user_query: 'hello', agent_response: 'world' });

    const promise = awaitTraceReady(traceAccessor, logger);
    await flushRetries();
    await expect(promise).resolves.toBeUndefined();
    expect(extractChatEvidenceMock).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('throws after exhausting retries when agent response never appears', async () => {
    extractChatEvidenceMock.mockResolvedValue({
      user_query: 'hello',
      agent_response: '',
    });

    const promise = awaitTraceReady(traceAccessor, logger);
    await flushRetries();
    await expect(promise).rejects.toThrow(
      `Trace ${traceId} is not ready: agent response not yet available`
    );
    expect(extractChatEvidenceMock).toHaveBeenCalledTimes(3);
  });

  it('propagates errors from extractChatEvidence', async () => {
    extractChatEvidenceMock.mockRejectedValue(new Error('ES query failed'));

    const promise = awaitTraceReady(traceAccessor, logger);
    await flushRetries();
    await expect(promise).rejects.toThrow('ES query failed');
  });
});
