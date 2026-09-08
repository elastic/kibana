/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  awaitTraceReady,
  type AwaitTraceReadyOptions,
  type AwaitTraceReadyRequest,
} from './trace_readiness';
import * as evidenceServiceModule from './evidence/evidence_service';
import type {
  EvidenceExtractionResult,
  InstrumentationProfileEvidenceResult,
} from './evidence/evidence_service';
import type { EvidenceRound, InstrumentationProfile } from './evidence/types';
import type { TraceAccessorWithSearch } from './trace_accessor';

jest.mock('./evidence/evidence_service');

const FAST_BUDGET: AwaitTraceReadyOptions = {
  retries: 5,
  minTimeout: 1,
  maxTimeout: 1,
  factor: 1,
  stabilityWindowMs: 0,
};

const EMPTY_ROUND: EvidenceRound = {
  input: { message: '' },
  response: { message: '' },
  steps: [],
};

const READY_ROUND: EvidenceRound = {
  input: { message: 'hello' },
  response: { message: 'world' },
  steps: [],
};

const buildExtraction = (round: EvidenceRound): EvidenceExtractionResult => ({
  round,
  evidence: {
    user_query: { status: round.input.message ? 'found' : 'not_found' },
    agent_response: { status: round.response.message ? 'found' : 'not_found' },
    tool_calls: { status: round.steps.length ? 'found' : 'not_found' },
  },
});

const buildProfileExtraction = (
  profile: InstrumentationProfile,
  round: EvidenceRound
): InstrumentationProfileEvidenceResult => ({
  profile,
  ...buildExtraction(round),
});

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
  const extractEvidenceMock = evidenceServiceModule.extractEvidence as jest.Mock;
  const extractProfilesEvidenceMock = evidenceServiceModule.extractProfilesEvidence as jest.Mock;
  const extractSelectedEvidenceMock = evidenceServiceModule.extractSelectedEvidence as jest.Mock;
  const hasResolvedEvidenceMock = evidenceServiceModule.hasResolvedEvidence as jest.Mock;
  const getRecommendedInstrumentationProfileMock =
    evidenceServiceModule.getRecommendedInstrumentationProfile as jest.Mock;

  const run = (
    request: AwaitTraceReadyRequest = {
      mode: 'complete',
      profile: 'elastic-inference',
    },
    options: AwaitTraceReadyOptions = FAST_BUDGET
  ) => awaitTraceReady(traceAccessor, request, logger, options);

  beforeEach(() => {
    jest.clearAllMocks();
    hasTraceDocumentsMock.mockResolvedValue(true);
    hasRootSpanMock.mockResolvedValue(true);
    extractEvidenceMock.mockResolvedValue(buildExtraction(READY_ROUND));
    hasResolvedEvidenceMock.mockImplementation(
      (round: EvidenceRound) =>
        Boolean(round.input.message.trim()) ||
        Boolean(round.response.message.trim()) ||
        round.steps.length > 0
    );
    getRecommendedInstrumentationProfileMock.mockImplementation(
      (profiles: InstrumentationProfileEvidenceResult[]) =>
        profiles.find(({ evidence }) =>
          [evidence.user_query, evidence.agent_response].every(({ status }) => status === 'found')
        )?.profile
    );
    extractSelectedEvidenceMock.mockImplementation(
      async (_traceAccessor: TraceAccessorWithSearch, profile?: InstrumentationProfile) => {
        if (profile) {
          return { selected: { profile, ...(await extractEvidenceMock()) } };
        }
        const profiles = await extractProfilesEvidenceMock();
        const recommendedProfile = getRecommendedInstrumentationProfileMock(profiles);
        return {
          profiles,
          selected: profiles.find(
            ({ profile: candidate }: InstrumentationProfileEvidenceResult) =>
              candidate === recommendedProfile
          ),
        };
      }
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('completes a trace-only profile after consecutive structurally equal rounds', async () => {
    await expect(run()).resolves.toEqual({
      profile: 'elastic-inference',
      ...buildExtraction(READY_ROUND),
      readiness: 'complete',
    });
    expect(extractEvidenceMock).toHaveBeenCalledTimes(2);
    expect(hasRootSpanMock).toHaveBeenCalledTimes(1);
  });

  it('requires stable evidence to span the configured window', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(5).mockReturnValue(10);

    await expect(
      run(
        { mode: 'stable', profile: 'elastic-inference' },
        { ...FAST_BUDGET, stabilityWindowMs: 10 }
      )
    ).resolves.toEqual(expect.objectContaining({ readiness: 'stable' }));
    expect(extractEvidenceMock).toHaveBeenCalledTimes(3);
    expect(hasRootSpanMock).not.toHaveBeenCalled();
  });

  it('applies the configured window to log-backed complete profiles', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(5).mockReturnValue(10);

    await expect(
      run({ mode: 'complete', profile: 'claude-code' }, { ...FAST_BUDGET, stabilityWindowMs: 10 })
    ).resolves.toEqual(expect.objectContaining({ readiness: 'complete' }));
    expect(extractEvidenceMock).toHaveBeenCalledTimes(3);
  });

  it('resets the stability baseline when the round changes', async () => {
    const changedRound: EvidenceRound = {
      ...READY_ROUND,
      steps: [{ tool_id: 'search' }],
    };
    extractEvidenceMock
      .mockResolvedValueOnce(buildExtraction(READY_ROUND))
      .mockResolvedValue(buildExtraction(changedRound));
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(15)
      .mockReturnValue(20);

    await expect(
      run(
        { mode: 'stable', profile: 'elastic-inference' },
        { ...FAST_BUDGET, stabilityWindowMs: 10 }
      )
    ).resolves.toEqual(expect.objectContaining({ round: changedRound, readiness: 'stable' }));
    expect(extractEvidenceMock).toHaveBeenCalledTimes(4);
  });

  it('uses structural equality for arbitrary JSON with reordered keys', async () => {
    const first: EvidenceRound = {
      ...READY_ROUND,
      steps: [{ arguments: { first: 1, second: 2 } }],
    };
    const reordered: EvidenceRound = {
      ...READY_ROUND,
      steps: [{ arguments: { second: 2, first: 1 } }],
    };
    extractEvidenceMock
      .mockResolvedValueOnce(buildExtraction(first))
      .mockResolvedValue(buildExtraction(reordered));

    await expect(run()).resolves.toEqual(
      expect.objectContaining({ round: reordered, readiness: 'complete' })
    );
    expect(extractEvidenceMock).toHaveBeenCalledTimes(2);
  });

  it('resets complete readiness when a tool step arrives between polls', async () => {
    const withTool: EvidenceRound = {
      ...READY_ROUND,
      steps: [{ tool_id: 'search' }],
    };
    extractEvidenceMock
      .mockResolvedValueOnce(buildExtraction(READY_ROUND))
      .mockResolvedValue(buildExtraction(withTool));

    await expect(run()).resolves.toEqual(
      expect.objectContaining({ round: withTool, readiness: 'complete' })
    );
    expect(extractEvidenceMock).toHaveBeenCalledTimes(3);
  });

  it.each([
    {
      name: 'input-only',
      round: { input: { message: 'hello' }, response: { message: '' }, steps: [] },
    },
    {
      name: 'response-only',
      round: { input: { message: '' }, response: { message: 'world' }, steps: [] },
    },
    {
      name: 'tool-only',
      round: { input: { message: '' }, response: { message: '' }, steps: [{ tool_id: 'search' }] },
    },
  ])('allows $name evidence to reach stable readiness', async ({ round }) => {
    extractEvidenceMock.mockResolvedValue(buildExtraction(round));

    await expect(run({ mode: 'stable', profile: 'elastic-inference' })).resolves.toEqual(
      expect.objectContaining({ round, readiness: 'stable' })
    );
  });

  it('never establishes a baseline for unchanged empty evidence', async () => {
    extractEvidenceMock.mockResolvedValue(buildExtraction(EMPTY_ROUND));
    extractProfilesEvidenceMock.mockResolvedValue([
      buildProfileExtraction('elastic-inference', EMPTY_ROUND),
    ]);

    await expect(run({ mode: 'stable', profile: 'elastic-inference' })).rejects.toEqual(
      expect.objectContaining({ kind: 'unresolvable', profiles: expect.any(Array) })
    );
    expect(extractEvidenceMock).toHaveBeenCalledTimes((FAST_BUDGET.retries ?? 0) + 1);
    expect(hasRootSpanMock).not.toHaveBeenCalled();
  });

  it('requires a non-empty response and a root span for complete readiness', async () => {
    const partialRound: EvidenceRound = {
      input: { message: 'hello' },
      response: { message: '' },
      steps: [{ tool_id: 'search' }],
    };
    extractEvidenceMock.mockResolvedValue(buildExtraction(partialRound));

    await expect(run()).resolves.toEqual(
      expect.objectContaining({ round: partialRound, readiness: 'best_effort' })
    );
    expect(hasRootSpanMock).not.toHaveBeenCalled();
  });

  it('returns best-effort evidence when a root span never arrives', async () => {
    hasRootSpanMock.mockResolvedValue(false);

    await expect(run()).resolves.toEqual(
      expect.objectContaining({ round: READY_ROUND, readiness: 'best_effort' })
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('best-effort'));
  });

  it('returns best-effort after a late baseline reset', async () => {
    const changedRound: EvidenceRound = {
      ...READY_ROUND,
      steps: [{ tool_id: 'late-tool' }],
    };
    extractEvidenceMock
      .mockResolvedValue(buildExtraction(READY_ROUND))
      .mockResolvedValueOnce(buildExtraction(READY_ROUND))
      .mockResolvedValueOnce(buildExtraction(READY_ROUND))
      .mockResolvedValueOnce(buildExtraction(READY_ROUND))
      .mockResolvedValueOnce(buildExtraction(READY_ROUND))
      .mockResolvedValueOnce(buildExtraction(READY_ROUND))
      .mockResolvedValueOnce(buildExtraction(changedRound));
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(4)
      .mockReturnValueOnce(10);

    await expect(
      run(
        { mode: 'stable', profile: 'elastic-inference' },
        { ...FAST_BUDGET, stabilityWindowMs: 20 }
      )
    ).resolves.toEqual(expect.objectContaining({ round: changedRound, readiness: 'best_effort' }));
  });

  it('re-probes auto-detection and resets when an earlier profile appears', async () => {
    const elasticRound = { ...READY_ROUND, response: { message: 'elastic' } };
    const eventsRound = { ...READY_ROUND, response: { message: 'events' } };
    const unresolvedEvents = buildProfileExtraction('otel-genai-events', EMPTY_ROUND);
    const resolvedEvents = buildProfileExtraction('otel-genai-events', eventsRound);
    const resolvedElastic = buildProfileExtraction('elastic-inference', elasticRound);
    extractProfilesEvidenceMock
      .mockResolvedValueOnce([unresolvedEvents, resolvedElastic])
      .mockResolvedValue([resolvedEvents, resolvedElastic]);
    jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(10).mockReturnValue(20);

    await expect(
      run({ mode: 'stable' }, { ...FAST_BUDGET, stabilityWindowMs: 10 })
    ).resolves.toEqual(
      expect.objectContaining({ profile: 'otel-genai-events', round: eventsRound })
    );
    expect(extractProfilesEvidenceMock).toHaveBeenCalledTimes(3);
    expect(extractEvidenceMock).not.toHaveBeenCalled();
  });

  it('throws not_ready after the budget when no documents are visible', async () => {
    hasTraceDocumentsMock.mockResolvedValue(false);

    await expect(run()).rejects.toEqual(
      expect.objectContaining({
        kind: 'not_ready',
        message: `Trace ${traceId} is not ready: no documents indexed in traces-* or logs-* yet`,
      })
    );
    expect(extractEvidenceMock).not.toHaveBeenCalled();
  });
});
