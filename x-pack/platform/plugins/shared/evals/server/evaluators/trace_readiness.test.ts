/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { awaitTraceReady } from './trace_readiness';
import * as evidenceServiceModule from './evidence/evidence_service';
import type { TraceAccessor } from './types';

jest.mock('./evidence/evidence_service');

describe('awaitTraceReady', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';
  const logger = loggingSystemMock.createLogger();
  const searchMock = jest.fn();
  const traceAccessor: TraceAccessor = {
    traceId,
    esClient: {
      search: searchMock,
    } as unknown as TraceAccessor['esClient'],
  };
  const normalizeEvidenceMock = evidenceServiceModule.normalizeEvidence as jest.Mock;
  const probeProfilesMock = evidenceServiceModule.probeProfiles as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves on the first attempt when a gradable response is already present', async () => {
    normalizeEvidenceMock.mockResolvedValue({
      input: { message: 'hello' },
      response: { message: 'world' },
      steps: [],
    });

    await expect(awaitTraceReady(traceAccessor, logger)).resolves.toBeUndefined();
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('retries while evidence is still being exported, then resolves once it lands', async () => {
    // The gradable response (a gen_ai `choice` log event) lands a beat after the
    // spans, so the first probe sees nothing and the readiness check must wait.
    normalizeEvidenceMock
      .mockResolvedValueOnce({ input: { message: '' }, response: { message: '' }, steps: [] })
      .mockResolvedValue({
        input: { message: 'hello' },
        response: { message: 'world' },
        steps: [],
      });

    const promise = awaitTraceReady(traceAccessor, logger);
    await jest.runAllTimersAsync();

    await expect(promise).resolves.toBeUndefined();
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('fails with a profile diagnostic after retries when no gradable content ever lands', async () => {
    normalizeEvidenceMock.mockResolvedValue({
      input: { message: '' },
      response: { message: '' },
      steps: [],
    });
    // hasNoTraceDocuments (final diagnostic) sees at least one indexed document, so
    // this is reported as "no gradable content" rather than "no documents".
    searchMock.mockResolvedValue({
      hits: { hits: [{ _source: { '@timestamp': '2026-07-10T10:00:00.000Z' } }] },
    });
    probeProfilesMock.mockResolvedValue([
      {
        profile: 'elastic-inference',
        evidence: {
          user_query: { status: 'not_found' },
          agent_response: { status: 'not_found' },
          tool_calls: { status: 'not_found' },
        },
      },
    ]);

    const promise = awaitTraceReady(traceAccessor, logger);
    const assertion = expect(promise).rejects.toThrow('no gradable content was found in its trace');
    await jest.runAllTimersAsync();
    await assertion;

    // Retried (4 retries => 5 attempts) before giving up.
    expect(logger.warn).toHaveBeenCalledTimes(5);
    expect(probeProfilesMock).toHaveBeenCalledTimes(1);
  });

  it('reports "no documents" when nothing at all was indexed for the trace', async () => {
    normalizeEvidenceMock.mockResolvedValue({
      input: { message: '' },
      response: { message: '' },
      steps: [],
    });
    // Both logs and traces searches come back empty => hasNoTraceDocuments is true.
    searchMock.mockResolvedValue({ hits: { hits: [] } });
    probeProfilesMock.mockResolvedValue([]);

    const promise = awaitTraceReady(traceAccessor, logger);
    const assertion = expect(promise).rejects.toThrow('no trace or log documents were indexed');
    await jest.runAllTimersAsync();
    await assertion;
  });
});
