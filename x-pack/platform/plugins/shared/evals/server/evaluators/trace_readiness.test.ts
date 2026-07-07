/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { awaitTraceReady } from './trace_readiness';
import * as traceEvidenceModule from './trace_evidence';
import type { TraceAccessor } from './types';

jest.mock('./trace_evidence');

describe('awaitTraceReady', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';
  const logger = loggingSystemMock.createLogger();
  const traceAccessor: TraceAccessor = {
    traceId,
    esClient: {} as TraceAccessor['esClient'],
  };
  const extractTraceEvidenceMock = traceEvidenceModule.extractTraceEvidence as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const flushRetries = async () => {
    // Async advance interleaves microtasks so the full pRetry chain (all
    // attempts + backoff timers) drains regardless of the retry count.
    for (let i = 0; i < 10; i++) {
      await jest.advanceTimersByTimeAsync(8000);
    }
  };

  it('resolves immediately when agent response is present', async () => {
    extractTraceEvidenceMock.mockResolvedValueOnce({
      user_query: 'hello',
      agent_response: 'world',
    });

    const promise = awaitTraceReady(traceAccessor, logger);
    await flushRetries();
    await expect(promise).resolves.toBeUndefined();
    expect(extractTraceEvidenceMock).toHaveBeenCalledTimes(1);
  });

  it('retries when agent response is empty and succeeds on subsequent attempt', async () => {
    extractTraceEvidenceMock
      .mockResolvedValueOnce({ user_query: 'hello', agent_response: '' })
      .mockResolvedValueOnce({ user_query: 'hello', agent_response: 'world' });

    const promise = awaitTraceReady(traceAccessor, logger);
    await flushRetries();
    await expect(promise).resolves.toBeUndefined();
    expect(extractTraceEvidenceMock).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('throws after exhausting retries when agent response never appears', async () => {
    extractTraceEvidenceMock.mockResolvedValue({
      user_query: 'hello',
      agent_response: '',
    });

    const promise = awaitTraceReady(traceAccessor, logger);
    // Attach the rejection handler before draining timers so the rejection that
    // occurs mid-flush is already handled (Kibana's jest treats an
    // asynchronously-handled rejection warning as a fatal error).
    const assertion = expect(promise).rejects.toThrow(
      `Trace ${traceId} is not ready: agent response not yet available`
    );
    await flushRetries();
    await assertion;
    expect(extractTraceEvidenceMock).toHaveBeenCalledTimes(5);
  });

  it('propagates errors from extractTraceEvidence', async () => {
    extractTraceEvidenceMock.mockRejectedValue(new Error('ES query failed'));

    const promise = awaitTraceReady(traceAccessor, logger);
    const assertion = expect(promise).rejects.toThrow('ES query failed');
    await flushRetries();
    await assertion;
  });
});
