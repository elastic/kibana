/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { awaitTraceReady } from './trace_readiness';
import * as evidenceServiceModule from './evidence/evidence_service';
import { getEvidenceMapping } from './evidence/resolve_mapping';
import type { TraceAccessorWithSearch } from './trace_accessor';
import type { EvidenceRound } from './evidence/types';

jest.mock('./evidence/evidence_service');

describe('awaitTraceReady', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';
  const logger = loggingSystemMock.createLogger();
  const traceAccessor: TraceAccessorWithSearch = {
    traceId,
    esClient: {
      search: jest.fn(),
    } as unknown as TraceAccessorWithSearch['esClient'],
    runSearch: jest.fn(),
  };
  const hasTraceDocumentsMock = evidenceServiceModule.hasTraceDocuments as jest.Mock;
  const normalizeEvidenceMock = evidenceServiceModule.normalizeEvidence as jest.Mock;
  const probeProfilesMock = evidenceServiceModule.probeProfiles as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retries when docs exist but response is missing while other evidence is present', async () => {
    hasTraceDocumentsMock.mockResolvedValue(true);
    const partialRound: EvidenceRound = {
      input: { message: 'hello' },
      response: { message: '' },
      steps: [],
    };
    const readyRound: EvidenceRound = {
      ...partialRound,
      response: { message: 'world' },
    };
    normalizeEvidenceMock.mockResolvedValueOnce(partialRound).mockResolvedValueOnce(readyRound);
    probeProfilesMock.mockResolvedValue([
      {
        profile: 'elastic-inference',
        evidence: {
          user_query: { status: 'found' },
          agent_response: { status: 'not_found' },
          tool_calls: { status: 'found' },
        },
      },
    ]);

    await expect(
      awaitTraceReady(
        traceAccessor,
        getEvidenceMapping('elastic-inference'),
        'elastic-inference',
        logger
      )
    ).resolves.toEqual(readyRound);
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('fails fast without retries when docs exist but requested mapping does not resolve evidence', async () => {
    hasTraceDocumentsMock.mockResolvedValueOnce(true);
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

    await expect(
      awaitTraceReady(
        traceAccessor,
        getEvidenceMapping('otel-genai-attributes'),
        'otel-genai-attributes',
        logger
      )
    ).rejects.toThrow(
      `Trace ${traceId} has documents but evidence is unresolvable for profile "otel-genai-attributes"`
    );
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('retries only while trace documents are still absent', async () => {
    hasTraceDocumentsMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const readyRound: EvidenceRound = {
      input: { message: 'hello' },
      response: { message: 'world' },
      steps: [],
    };
    normalizeEvidenceMock.mockResolvedValueOnce(readyRound);

    await expect(
      awaitTraceReady(
        traceAccessor,
        getEvidenceMapping('elastic-inference'),
        'elastic-inference',
        logger
      )
    ).resolves.toEqual(readyRound);
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns ready when requested profile resolves agent response from existing docs', async () => {
    hasTraceDocumentsMock.mockResolvedValueOnce(true);
    const readyRound: EvidenceRound = {
      input: { message: '' },
      response: { message: 'Found via otel-genai-attributes' },
      steps: [],
    };
    normalizeEvidenceMock.mockResolvedValueOnce(readyRound);

    await expect(
      awaitTraceReady(
        traceAccessor,
        getEvidenceMapping('otel-genai-attributes'),
        'otel-genai-attributes',
        logger
      )
    ).resolves.toEqual(readyRound);
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(1);
    expect(probeProfilesMock).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns partial round after retry exhaustion when response stays missing', async () => {
    hasTraceDocumentsMock.mockResolvedValue(true);
    const partialRound: EvidenceRound = {
      input: { message: 'hello' },
      response: { message: '' },
      steps: [{ tool_id: 'search' }],
    };
    normalizeEvidenceMock.mockResolvedValue(partialRound);
    probeProfilesMock.mockResolvedValue([
      {
        profile: 'elastic-inference',
        evidence: {
          user_query: { status: 'found' },
          agent_response: { status: 'not_found' },
          tool_calls: { status: 'found' },
        },
      },
    ]);

    await expect(
      awaitTraceReady(
        traceAccessor,
        getEvidenceMapping('elastic-inference'),
        'elastic-inference',
        logger
      )
    ).resolves.toEqual(partialRound);
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalled();
  }, 15000);
});
