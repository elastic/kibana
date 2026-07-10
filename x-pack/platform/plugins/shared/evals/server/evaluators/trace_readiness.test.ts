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
  });

  it('fails fast without retries when docs exist but mapping does not resolve evidence', async () => {
    searchMock
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { '@timestamp': '2026-07-10T10:00:00.000Z' } }] },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } });
    normalizeEvidenceMock.mockResolvedValueOnce({
      input: { message: '' },
      response: { message: '' },
      steps: [],
    });
    probeProfilesMock.mockResolvedValueOnce([
      {
        profile: 'elastic-inference',
        evidence: {
          user_query: { status: 'not_found' },
          agent_response: { status: 'not_found' },
          tool_calls: { status: 'not_found' },
        },
      },
    ]);

    await expect(awaitTraceReady(traceAccessor, logger)).rejects.toThrow(
      `Trace ${traceId} has documents but evidence is unresolvable for profile "elastic-inference"`
    );
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('retries only while trace documents are still absent', async () => {
    searchMock
      .mockResolvedValueOnce({ hits: { hits: [] } })
      .mockResolvedValueOnce({ hits: { hits: [] } })
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { '@timestamp': '2026-07-10T10:00:01.000Z' } }] },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } });
    normalizeEvidenceMock.mockResolvedValueOnce({
      input: { message: 'hello' },
      response: { message: 'world' },
      steps: [],
    });

    await expect(awaitTraceReady(traceAccessor, logger)).resolves.toBeUndefined();
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalled();
  });
});
