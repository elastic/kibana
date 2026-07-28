/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { awaitTraceReady, type AwaitTraceReadyOptions } from './trace_readiness';
import * as evidenceServiceModule from './evidence/evidence_service';
import { getInstrumentationProfile } from './evidence/resolve_instrumentation';
import type { TraceAccessorWithSearch } from './trace_accessor';
import type { EvidenceRound } from './evidence/types';

jest.mock('./evidence/evidence_service');

const FAST_BUDGET: AwaitTraceReadyOptions = {
  retries: 6,
  minTimeout: 1,
  maxTimeout: 5,
  factor: 1,
};

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
  const hasRootSpanMock = evidenceServiceModule.hasRootSpan as jest.Mock;
  const normalizeEvidenceMock = evidenceServiceModule.normalizeEvidence as jest.Mock;
  const probeProfilesMock = evidenceServiceModule.probeProfiles as jest.Mock;

  const run = (profile: Parameters<typeof getInstrumentationProfile>[0] = 'elastic-inference') =>
    awaitTraceReady(
      traceAccessor,
      getInstrumentationProfile(profile),
      profile,
      logger,
      FAST_BUDGET
    );

  beforeEach(() => {
    jest.clearAllMocks();
    hasTraceDocumentsMock.mockResolvedValue(true);
    hasRootSpanMock.mockResolvedValue(true);
  });

  it('returns evidence once the response is stable across polls and the root span is indexed', async () => {
    const readyRound: EvidenceRound = {
      input: { message: 'hello' },
      response: { message: 'world' },
      steps: [],
    };
    normalizeEvidenceMock.mockResolvedValue(readyRound);

    await expect(run()).resolves.toEqual(readyRound);
    // First poll seeds the stability baseline; the second confirms it and gates on root.
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(2);
    expect(hasRootSpanMock).toHaveBeenCalledTimes(1);
    expect(probeProfilesMock).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('waits for the final answer instead of grading an earlier intermediate turn', async () => {
    const intermediate: EvidenceRound = {
      input: { message: 'What element is gold?' },
      response: { message: 'Let me look that up…' },
      steps: [],
    };
    const final: EvidenceRound = {
      ...intermediate,
      response: { message: 'Gold is the element Au.' },
    };
    // poll 1 -> intermediate (baseline), poll 2 -> final (changed), poll 3 -> final (stable).
    normalizeEvidenceMock
      .mockResolvedValueOnce(intermediate)
      .mockResolvedValueOnce(final)
      .mockResolvedValue(final);

    await expect(run()).resolves.toEqual(final);
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(3);
  });

  it('does not grade a stable intermediate response while the root span is still missing', async () => {
    const intermediate: EvidenceRound = {
      input: { message: 'What element is gold?' },
      response: { message: 'Working on it…' },
      steps: [],
    };
    const final: EvidenceRound = {
      ...intermediate,
      response: { message: 'Gold is the element Au.' },
    };
    // Intermediate is stable across polls 1-2, but the task is still running (no root),
    // so it must be rejected; only the later stable final answer is accepted.
    normalizeEvidenceMock
      .mockResolvedValueOnce(intermediate)
      .mockResolvedValueOnce(intermediate)
      .mockResolvedValueOnce(final)
      .mockResolvedValue(final);
    hasRootSpanMock.mockResolvedValueOnce(false).mockResolvedValue(true);

    await expect(run()).resolves.toEqual(final);
    // root checked on the stable-intermediate poll (false) and again on the stable-final poll (true).
    expect(hasRootSpanMock).toHaveBeenCalledTimes(2);
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes(4);
  });

  it('grades best-effort and logs loudly when a partial trace never gets a root span', async () => {
    const stableRound: EvidenceRound = {
      input: { message: 'hello' },
      response: { message: 'world' },
      steps: [],
    };
    normalizeEvidenceMock.mockResolvedValue(stableRound);
    hasRootSpanMock.mockResolvedValue(false);

    await expect(run()).resolves.toEqual(stableRound);
    expect(hasRootSpanMock).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('best-effort'));
  });

  it('waits out partial indexing (auxiliary spans only) and grades once content resolves', async () => {
    const empty: EvidenceRound = {
      input: { message: '' },
      response: { message: '' },
      steps: [],
    };
    const resolved: EvidenceRound = {
      input: { message: 'hello' },
      response: { message: 'world' },
      steps: [],
    };
    // polls 1-2: only auxiliary spans indexed, so evidence is unresolvable; poll 3 seeds the
    // content baseline; poll 4 confirms it is stable and gates on the root span.
    normalizeEvidenceMock
      .mockResolvedValueOnce(empty)
      .mockResolvedValueOnce(empty)
      .mockResolvedValue(resolved);

    await expect(run()).resolves.toEqual(resolved);
    // The unresolvable branch retried instead of aborting, so no probe and no degradation.
    expect(probeProfilesMock).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('concludes "unresolvable" (with a probe) only after exhausting the budget', async () => {
    normalizeEvidenceMock.mockResolvedValue({
      input: { message: '' },
      response: { message: '' },
      steps: [],
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

    await expect(run('otel-genai-attributes')).rejects.toEqual(
      expect.objectContaining({
        name: 'TraceReadinessError',
        kind: 'unresolvable',
        message: expect.stringContaining(
          `Trace ${traceId} has documents but evidence is unresolvable for profile "otel-genai-attributes"`
        ),
      })
    );
    expect(normalizeEvidenceMock).toHaveBeenCalledTimes((FAST_BUDGET.retries ?? 0) + 1);
    expect(probeProfilesMock).toHaveBeenCalledTimes(1);
    expect(hasRootSpanMock).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('throws TraceReadinessError after retries when documents never appear', async () => {
    hasTraceDocumentsMock.mockResolvedValue(false);

    await expect(run()).rejects.toEqual(
      expect.objectContaining({
        name: 'TraceReadinessError',
        kind: 'not_ready',
        message: `Trace ${traceId} is not ready: no documents indexed in traces-* or logs-* yet`,
      })
    );
    expect(normalizeEvidenceMock).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('retries only while trace documents are still absent', async () => {
    hasTraceDocumentsMock.mockResolvedValueOnce(false).mockResolvedValue(true);
    const readyRound: EvidenceRound = {
      input: { message: 'hello' },
      response: { message: 'world' },
      steps: [],
    };
    normalizeEvidenceMock.mockResolvedValue(readyRound);

    await expect(run()).resolves.toEqual(readyRound);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns a partial round best-effort when the response never resolves', async () => {
    const partialRound: EvidenceRound = {
      input: { message: 'hello' },
      response: { message: '' },
      steps: [{ tool_id: 'search' }],
    };
    normalizeEvidenceMock.mockResolvedValue(partialRound);

    await expect(run()).resolves.toEqual(partialRound);
    // Response is empty, so the root gate is never reached.
    expect(hasRootSpanMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('best-effort'));
  });

  it('grades stable, resolvable evidence for non-default profiles', async () => {
    const readyRound: EvidenceRound = {
      input: { message: '' },
      response: { message: 'Found via otel-genai-attributes' },
      steps: [],
    };
    normalizeEvidenceMock.mockResolvedValue(readyRound);

    await expect(run('otel-genai-attributes')).resolves.toEqual(readyRound);
    expect(probeProfilesMock).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns ready for agent-builder-tool profile when tool result maps to agent_response', async () => {
    const readyRound: EvidenceRound = {
      input: { message: '{"query":"status:failed"}' },
      response: { message: 'Found 2 failed runs.' },
      steps: [
        {
          tool_call_id: 'tool-call-1',
          tool_id: 'search_runs',
          arguments: { query: 'status:failed' },
          result: { count: 2 },
        },
      ],
    };
    normalizeEvidenceMock.mockResolvedValue(readyRound);

    await expect(run('agent-builder-tool')).resolves.toEqual(readyRound);
    expect(probeProfilesMock).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
