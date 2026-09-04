/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalLoggingProfileRoutes } from './logging_profile_route';

const mockValidateLoggingQueriesHandler = jest.fn();
const mockWriteLoggingProfile = jest.fn();
const mockReadLoggingProfile = jest.fn();
const mockDetectLoggingProfileDrift = jest.fn();

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../utils/assert_not_paused', () => ({
  assertNotPaused: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../../agent_builder/tools/validate_logging_queries/handler', () => ({
  validateLoggingQueriesHandler: (...args: unknown[]) => mockValidateLoggingQueriesHandler(...args),
}));
jest.mock('../../../../lib/knowledge_indicators/code_intelligence/codebox_client', () => ({
  getCodeboxClient: jest.fn().mockReturnValue({
    health: jest.fn().mockResolvedValue({ status: 'ok' }),
    grep: jest.fn().mockResolvedValue([]),
  }),
  resetCodeboxClient: jest.fn(),
}));

jest.mock('../../../../lib/knowledge_indicators/code_intelligence', () => ({
  readLoggingProfile: (...args: unknown[]) => mockReadLoggingProfile(...args),
  writeLoggingProfile: (...args: unknown[]) => mockWriteLoggingProfile(...args),
  detectLoggingProfileDrift: (...args: unknown[]) => mockDetectLoggingProfileDrift(...args),
}));

const checkRoute =
  internalLoggingProfileRoutes['POST /internal/streams/code_intelligence/_check_logging_profile'];
const persistRoute =
  internalLoggingProfileRoutes['POST /internal/streams/code_intelligence/_persist_logging_profile'];

type CheckHandlerParams = Parameters<typeof checkRoute.handler>[0];
type PersistHandlerParams = Parameters<typeof persistRoute.handler>[0];

const REPO_TOTAL_LINES = 108873;

const baseParams = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {
      body: {
        repository: 'supabase/realtime',
        gitSha: 'f5abfb19445404',
        runId: 'run-1',
        ...overrides,
      },
    },
    request: { id: 'req-1' },
    getScopedClients: jest.fn().mockResolvedValue({
      licensing: {},
      scopedClusterClient: { asCurrentUser: {} },
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({}),
    }),
    getSpaceId: jest.fn().mockResolvedValue('default'),
    server: { core: { featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) } } },
    logger: { get: jest.fn().mockReturnValue({ debug: jest.fn(), warn: jest.fn() }) },
    maintenanceService: { isPaused: jest.fn().mockResolvedValue(false) },
  } as unknown as PersistHandlerParams);

describe('persistLoggingProfileRoute — server-side re-validation (INV-001 / INV-006)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-validates each grep server-side and persists the server-derived hit count', async () => {
    mockValidateLoggingQueriesHandler.mockResolvedValue({
      repo_total_lines: REPO_TOTAL_LINES,
      results: [
        {
          grep: '.*log_error[(].*',
          pass: true,
          hits: 179,
          hit_ratio: 179 / REPO_TOTAL_LINES,
          covers_evidence: true,
          error: null,
          sample: [],
          status: 'ok',
        },
      ],
    });
    mockWriteLoggingProfile.mockResolvedValue(undefined);

    const result = await persistRoute.handler(
      baseParams({
        greps: [
          {
            regex: '.*log_error[(].*',
            // Agent self-reports a WRONG count; the server-derived 179 must win.
            expect_call_sites: 999,
            evidence: { path: 'lib/realtime/logs.ex', line: 21 },
          },
        ],
      }) as unknown as PersistHandlerParams
    );

    // The validate handler was called with the candidate (regex + evidence only).
    expect(mockValidateLoggingQueriesHandler).toHaveBeenCalledTimes(1);
    const callArgs = mockValidateLoggingQueriesHandler.mock.calls[0][0];
    expect(callArgs.greps).toEqual([
      { regex: '.*log_error[(].*', evidence: { path: 'lib/realtime/logs.ex', line: 21 } },
    ]);

    // writeLoggingProfile received the SERVER-DERIVED count and repoTotalLines (INV-006).
    expect(mockWriteLoggingProfile).toHaveBeenCalledTimes(1);
    const writeArgs = mockWriteLoggingProfile.mock.calls[0][0];
    expect(writeArgs.repoTotalLines).toBe(REPO_TOTAL_LINES);
    expect(writeArgs.greps).toEqual([
      {
        regex: '.*log_error[(].*',
        expect_call_sites: 179,
        evidence: { path: 'lib/realtime/logs.ex', line: 21 },
      },
    ]);

    expect(result.persisted).toBe(1);
  });

  it('rejects a grep that fails server-side validation (over-capture, INV-006)', async () => {
    mockValidateLoggingQueriesHandler.mockResolvedValue({
      repo_total_lines: REPO_TOTAL_LINES,
      results: [
        {
          grep: '.*log.*',
          pass: false,
          hits: 1695,
          hit_ratio: 1695 / REPO_TOTAL_LINES,
          covers_evidence: true,
          error: null,
          sample: [],
          status: 'over_capture',
        },
      ],
    });

    await expect(
      persistRoute.handler(
        baseParams({
          greps: [
            {
              regex: '.*log.*',
              expect_call_sites: 1, // agent self-reports a low count to bypass the ceiling
              evidence: { path: 'lib/realtime/logs.ex', line: 21 },
            },
          ],
        }) as unknown as PersistHandlerParams
      )
    ).rejects.toThrow(/failed server-side validation/);

    // Nothing was persisted.
    expect(mockWriteLoggingProfile).not.toHaveBeenCalled();
  });

  it('rejects a zero-hit grep (INV-001)', async () => {
    mockValidateLoggingQueriesHandler.mockResolvedValue({
      repo_total_lines: REPO_TOTAL_LINES,
      results: [
        {
          grep: 'log_error[(].*',
          pass: false,
          hits: 0,
          hit_ratio: 0,
          covers_evidence: false,
          error: null,
          sample: [],
          status: 'zero_hits',
        },
      ],
    });

    await expect(
      persistRoute.handler(
        baseParams({
          greps: [
            {
              regex: 'log_error[(].*',
              expect_call_sites: 50,
              evidence: { path: 'lib/realtime/logs.ex', line: 21 },
            },
          ],
        }) as unknown as PersistHandlerParams
      )
    ).rejects.toThrow(/failed server-side validation/);
    expect(mockWriteLoggingProfile).not.toHaveBeenCalled();
  });

  it('persists an empty grep list (no house wrapper is a valid profile)', async () => {
    mockValidateLoggingQueriesHandler.mockResolvedValue({
      repo_total_lines: REPO_TOTAL_LINES,
      results: [],
    });
    mockWriteLoggingProfile.mockResolvedValue(undefined);

    const result = await persistRoute.handler(
      baseParams({ greps: [] }) as unknown as PersistHandlerParams
    );
    expect(result.persisted).toBe(0);
    expect(mockWriteLoggingProfile).toHaveBeenCalledTimes(1);
    expect(mockWriteLoggingProfile.mock.calls[0][0].greps).toEqual([]);
  });

  it('threads gitRefKey into validateLoggingQueriesHandler for an incremental-indexed repo', async () => {
    mockValidateLoggingQueriesHandler.mockResolvedValue({
      repo_total_lines: REPO_TOTAL_LINES,
      results: [
        {
          grep: '.*log_error[(].*',
          pass: true,
          hits: 179,
          hit_ratio: 179 / REPO_TOTAL_LINES,
          covers_evidence: true,
          error: null,
          sample: [],
          status: 'ok',
        },
      ],
    });
    mockWriteLoggingProfile.mockResolvedValue(undefined);

    await persistRoute.handler(
      baseParams({
        gitRefKey: 'supabase/realtime@main',
        greps: [
          {
            regex: '.*log_error[(].*',
            expect_call_sites: 179,
            evidence: { path: 'lib/realtime/logs.ex', line: 21 },
          },
        ],
      }) as unknown as PersistHandlerParams
    );

    expect(mockValidateLoggingQueriesHandler).toHaveBeenCalledWith(
      expect.objectContaining({ repository: 'supabase/realtime', gitCommit: 'f5abfb19445404' })
    );
  });
});

describe('checkLoggingProfileRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests refresh when no profile exists', async () => {
    mockReadLoggingProfile.mockResolvedValue(undefined);

    const result = await checkRoute.handler(baseParams() as unknown as CheckHandlerParams);

    expect(result).toEqual({ has_profile: false, needs_refresh: true, reason: 'no_profile' });
    expect(mockDetectLoggingProfileDrift).not.toHaveBeenCalled();
  });

  it('reports drift refresh when a stored grep dropped to zero', async () => {
    mockReadLoggingProfile.mockResolvedValue({
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
      generated_at: '2026-08-13T00:00:00.000Z',
      greps: [
        { regex: '.*log_error[(].*', expect_call_sites: 179, evidence: { path: 'a', line: 1 } },
      ],
    });
    mockDetectLoggingProfileDrift.mockResolvedValue({
      refresh: true,
      greps: [
        {
          regex: '.*log_error[(].*',
          expected: 179,
          actual: 0,
          failed: false,
          refresh: true,
          reason: 'zero',
        },
      ],
    });

    const result = await checkRoute.handler(baseParams() as unknown as CheckHandlerParams);

    expect(result.has_profile).toBe(true);
    expect(result.needs_refresh).toBe(true);
    expect(result.reason).toBe('drift');
  });

  it('does NOT request refresh when a drift recount query failed (INV-002)', async () => {
    mockReadLoggingProfile.mockResolvedValue({
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
      generated_at: '2026-08-13T00:00:00.000Z',
      greps: [
        { regex: '.*log_error[(].*', expect_call_sites: 179, evidence: { path: 'a', line: 1 } },
      ],
    });
    mockDetectLoggingProfileDrift.mockResolvedValue({
      refresh: false,
      greps: [
        {
          regex: '.*log_error[(].*',
          expected: 179,
          actual: -1,
          failed: true,
          refresh: false,
          reason: null,
        },
      ],
    });

    const result = await checkRoute.handler(baseParams() as unknown as CheckHandlerParams);

    expect(result.needs_refresh).toBe(false);
    expect(result.reason).toBe('query_failed');
  });

  it('threads gitRefKey into detectLoggingProfileDrift for an incremental-indexed repo', async () => {
    mockReadLoggingProfile.mockResolvedValue({
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
      generated_at: '2026-08-13T00:00:00.000Z',
      greps: [
        { regex: '.*log_error[(].*', expect_call_sites: 179, evidence: { path: 'a', line: 1 } },
      ],
    });
    mockDetectLoggingProfileDrift.mockResolvedValue({
      refresh: false,
      greps: [
        {
          regex: '.*log_error[(].*',
          expected: 179,
          actual: 179,
          failed: false,
          refresh: false,
          reason: null,
        },
      ],
    });

    await checkRoute.handler(
      baseParams({ gitRefKey: 'supabase/realtime@main' }) as unknown as CheckHandlerParams
    );

    expect(mockDetectLoggingProfileDrift).toHaveBeenCalledWith(
      expect.objectContaining({ repository: 'supabase/realtime', gitCommit: 'f5abfb19445404' })
    );
  });
});
