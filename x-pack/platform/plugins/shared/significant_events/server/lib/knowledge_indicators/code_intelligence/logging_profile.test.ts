/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { CODE_ANALYSIS_FEATURE_TYPE } from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import { CODE_FEATURE_SUBTYPE_LOGGING_PROFILE, OVER_CAPTURE_CEILING } from './constants';
import {
  LoggingProfileValidationError,
  detectLoggingProfileDrift,
  readLoggingProfile,
  writeLoggingProfile,
} from './logging_profile';
import type { LoggingProfile, LoggingProfileGrep } from './types';

const grep = (
  regex: string,
  expectCallSites: number,
  path = 'lib/realtime/logs.ex',
  line = 21
): LoggingProfileGrep => ({
  regex,
  expect_call_sites: expectCallSites,
  evidence: { path, line },
});

const REPO_TOTAL_LINES = 108873;

describe('writeLoggingProfile — persistence invariants', () => {
  const logger = loggingSystemMock.createLogger();
  const kiClient = {
    getFeatures: jest.fn(),
    bulk: jest.fn().mockResolvedValue(undefined),
  } as unknown as KnowledgeIndicatorClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists a profile of valid greps (INV-001 / INV-006 pass)', async () => {
    await writeLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
      greps: [grep('.*log_error[(].*', 179), grep('.*maybe_log_error[(].*', 12)],
      repoTotalLines: REPO_TOTAL_LINES,
      runId: 'run-1',
      logger,
    });

    expect(kiClient.bulk).toHaveBeenCalledTimes(1);
    const [streamName, operations] = (kiClient.bulk as jest.Mock).mock.calls[0];
    expect(streamName).toContain('repository:');
    expect(operations).toHaveLength(1);
    const feature = (operations[0] as { index: { feature: Record<string, unknown> } }).index
      .feature;
    expect(feature.id).toBe(CODE_FEATURE_SUBTYPE_LOGGING_PROFILE);
    expect(feature.type).toBe(CODE_ANALYSIS_FEATURE_TYPE);
    expect(feature.subtype).toBe(CODE_FEATURE_SUBTYPE_LOGGING_PROFILE);
    expect((feature.properties as { greps: unknown[] }).greps).toHaveLength(2);
  });

  it('rejects a grep with no validated non-zero hit count (INV-001)', async () => {
    const bad = grep('.*log_error[(].*', 0);
    await expect(
      writeLoggingProfile({
        kiClient,
        spaceId: 'default',
        repository: 'supabase/realtime',
        commit: 'f5abfb19445404',
        greps: [bad],
        repoTotalLines: REPO_TOTAL_LINES,
        runId: 'run-1',
        logger,
      })
    ).rejects.toThrow(LoggingProfileValidationError);

    await expect(
      writeLoggingProfile({
        kiClient,
        spaceId: 'default',
        repository: 'supabase/realtime',
        commit: 'f5abfb19445404',
        greps: [grep('.*log_error[(].*', -1)],
        repoTotalLines: REPO_TOTAL_LINES,
        runId: 'run-1',
        logger,
      })
    ).rejects.toThrow(LoggingProfileValidationError);

    // Nothing was persisted.
    expect(kiClient.bulk).not.toHaveBeenCalled();
  });

  it('rejects a grep whose hit ratio meets the over-capture ceiling (INV-006)', async () => {
    // 1695 hits / 108873 = ~1.56%, >= the 1% ceiling.
    const overCapture = grep('.*log.*', 1695);
    await expect(
      writeLoggingProfile({
        kiClient,
        spaceId: 'default',
        repository: 'supabase/realtime',
        commit: 'f5abfb19445404',
        greps: [overCapture],
        repoTotalLines: REPO_TOTAL_LINES,
        runId: 'run-1',
        logger,
      })
    ).rejects.toMatchObject({
      regex: '.*log.*',
      reason: 'over_capture',
    });
    expect(kiClient.bulk).not.toHaveBeenCalled();
  });

  it('accepts a grep just under the ceiling', async () => {
    // 179 / 108873 = ~0.16%, under the 1% ceiling.
    await writeLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
      greps: [grep('.*log_error[(].*', 179)],
      repoTotalLines: REPO_TOTAL_LINES,
      runId: 'run-1',
      logger,
    });
    expect(kiClient.bulk).toHaveBeenCalledTimes(1);
  });

  it('honours a custom ceiling', async () => {
    // 179 / 108873 = ~0.16%; with a stricter 0.0001 ceiling this is over-capture.
    await expect(
      writeLoggingProfile({
        kiClient,
        spaceId: 'default',
        repository: 'supabase/realtime',
        commit: 'f5abfb19445404',
        greps: [grep('.*log_error[(].*', 179)],
        repoTotalLines: REPO_TOTAL_LINES,
        ceiling: 0.0001,
        runId: 'run-1',
        logger,
      })
    ).rejects.toMatchObject({ reason: 'over_capture' });
  });

  it('persists an empty greps list (no house wrapper is a valid profile)', async () => {
    await writeLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'bitwarden/server',
      commit: 'abc123',
      greps: [],
      repoTotalLines: REPO_TOTAL_LINES,
      runId: 'run-1',
      logger,
    });
    expect(kiClient.bulk).toHaveBeenCalledTimes(1);
    const operations = (kiClient.bulk as jest.Mock).mock.calls[0][1];
    const feature = (operations[0] as { index: { feature: Record<string, unknown> } }).index
      .feature;
    expect((feature.properties as { greps: unknown[] }).greps).toEqual([]);
  });

  it('skips the over-capture check when repoTotalLines is omitted', async () => {
    // No repoTotalLines -> the caller is trusted to have enforced the ceiling via
    // the validate tool, so a high expect_call_sites does not throw here.
    await expect(
      writeLoggingProfile({
        kiClient,
        spaceId: 'default',
        repository: 'supabase/realtime',
        commit: 'f5abfb19445404',
        greps: [grep('.*log.*', 1695)],
        runId: 'run-1',
        logger,
      })
    ).resolves.toBeDefined();
    expect(kiClient.bulk).toHaveBeenCalledTimes(1);
  });

  it('invokes beforeWrite before the bulk write', async () => {
    const beforeWrite = jest.fn();
    await writeLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
      greps: [grep('.*log_error[(].*', 179)],
      repoTotalLines: REPO_TOTAL_LINES,
      runId: 'run-1',
      beforeWrite,
      logger,
    });
    expect(beforeWrite).toHaveBeenCalledTimes(1);
    expect(kiClient.bulk).toHaveBeenCalledTimes(1);
    // beforeWrite must have been invoked earlier than the bulk write.
    expect(beforeWrite.mock.invocationCallOrder[0]).toBeLessThan(
      (kiClient.bulk as jest.Mock).mock.invocationCallOrder[0]
    );
  });
});

describe('readLoggingProfile', () => {
  const kiClient = {
    getFeatures: jest.fn(),
    bulk: jest.fn(),
  } as unknown as KnowledgeIndicatorClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const profileFeature = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: CODE_FEATURE_SUBTYPE_LOGGING_PROFILE,
    stream_name: 'code:repository:abc',
    type: CODE_ANALYSIS_FEATURE_TYPE,
    subtype: CODE_FEATURE_SUBTYPE_LOGGING_PROFILE,
    description: 'profile',
    properties: {
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
      generated_at: '2026-08-13T00:00:00.000Z',
      greps: [
        {
          regex: '.*log_error[(].*',
          expect_call_sites: 179,
          evidence: { path: 'lib/realtime/logs.ex', line: 21 },
        },
      ],
      ...overrides,
    },
    confidence: 90,
    uuid: 'uuid-1',
  });

  it('deserializes a persisted profile feature', async () => {
    (kiClient.getFeatures as jest.Mock).mockResolvedValue({ hits: [profileFeature()] });

    const profile = await readLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'supabase/realtime',
    });

    expect(profile).toEqual({
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
      greps: [
        {
          regex: '.*log_error[(].*',
          expect_call_sites: 179,
          evidence: { path: 'lib/realtime/logs.ex', line: 21 },
        },
      ],
      generated_at: '2026-08-13T00:00:00.000Z',
    });
  });

  it('returns undefined when no profile feature exists', async () => {
    (kiClient.getFeatures as jest.Mock).mockResolvedValue({ hits: [] });

    const profile = await readLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'supabase/realtime',
    });

    expect(profile).toBeUndefined();
  });

  it('returns undefined when a commit filter does not match', async () => {
    (kiClient.getFeatures as jest.Mock).mockResolvedValue({ hits: [profileFeature()] });

    const profile = await readLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'supabase/realtime',
      commit: 'different-commit',
    });

    expect(profile).toBeUndefined();
  });

  it('returns the profile when the commit filter matches', async () => {
    (kiClient.getFeatures as jest.Mock).mockResolvedValue({ hits: [profileFeature()] });

    const profile = await readLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
    });

    expect(profile?.commit).toBe('f5abfb19445404');
  });

  it('ignores non-profile features on the same stream', async () => {
    const otherFeature = {
      id: 'repo_type',
      stream_name: 'code:repository:abc',
      type: CODE_ANALYSIS_FEATURE_TYPE,
      subtype: 'repo_type',
      description: 'repo type',
      properties: { repository: 'supabase/realtime', repo_type: 'app' },
      confidence: 90,
      uuid: 'uuid-2',
    };
    (kiClient.getFeatures as jest.Mock).mockResolvedValue({
      hits: [otherFeature, profileFeature()],
    });

    const profile = await readLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'supabase/realtime',
    });

    expect(profile?.greps).toHaveLength(1);
  });

  it('treats a profile whose greps failed to deserialize as absent', async () => {
    (kiClient.getFeatures as jest.Mock).mockResolvedValue({
      hits: [
        profileFeature({
          greps: [
            { regex: '.*log_error[(].*', expect_call_sites: 179, evidence: { path: 'x', line: 1 } },
            { not_a_valid_grep: true },
          ],
        }),
      ],
    });

    const profile = await readLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'supabase/realtime',
    });

    expect(profile).toBeUndefined();
  });
});

describe('OVER_CAPTURE_CEILING', () => {
  it('is the documented 1% value', () => {
    // `.*log.*` at 1.6% must be over-capture; `.*log_error[(].*` at 0.16% must pass.
    expect(OVER_CAPTURE_CEILING).toBe(0.01);
    expect(1695 / 108873).toBeGreaterThanOrEqual(OVER_CAPTURE_CEILING);
    expect(179 / 108873).toBeLessThan(OVER_CAPTURE_CEILING);
  });
});

describe('detectLoggingProfileDrift', () => {
  const logger = loggingSystemMock.createLogger();

  const STATS_COLUMNS = [{ name: 'hits', type: 'long' }];
  const statsRow = (hits: number) => [[hits]];
  const statsResponse = (hits: number) => ({ columns: STATS_COLUMNS, values: statsRow(hits) });

  const profile: LoggingProfile = {
    repository: 'supabase/realtime',
    commit: 'f5abfb19445404',
    generated_at: '2026-08-13T00:00:00.000Z',
    greps: [grep('.*log_error[(].*', 179)],
  };

  const esClient = () => elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('steady count does NOT request refresh', async () => {
    const client = esClient();
    client.esql.query.mockResolvedValue(statsResponse(179));

    const result = await detectLoggingProfileDrift({
      esClient: client,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      profile,
      logger,
    });

    expect(result.refresh).toBe(false);
    expect(result.greps).toHaveLength(1);
    expect(result.greps[0]).toMatchObject({
      regex: '.*log_error[(].*',
      expected: 179,
      actual: 179,
      failed: false,
      refresh: false,
      reason: null,
    });
  });

  it('drop to zero requests refresh (reason: zero)', async () => {
    const client = esClient();
    client.esql.query.mockResolvedValue(statsResponse(0));

    const result = await detectLoggingProfileDrift({
      esClient: client,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      profile,
      logger,
    });

    expect(result.refresh).toBe(true);
    expect(result.greps[0]).toMatchObject({
      actual: 0,
      failed: false,
      refresh: true,
      reason: 'zero',
    });
  });

  it('large ratio drop requests refresh (reason: ratio_drop)', async () => {
    const client = esClient();
    // 179 -> 50 is a ~72% drop, > the default 0.5 ratio.
    client.esql.query.mockResolvedValue(statsResponse(50));

    const result = await detectLoggingProfileDrift({
      esClient: client,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      profile,
      logger,
    });

    expect(result.refresh).toBe(true);
    expect(result.greps[0]).toMatchObject({
      actual: 50,
      failed: false,
      refresh: true,
      reason: 'ratio_drop',
    });
  });

  it('a small drop within the ratio does NOT request refresh', async () => {
    const client = esClient();
    // 179 -> 100 is a ~44% drop, <= the default 0.5 ratio.
    client.esql.query.mockResolvedValue(statsResponse(100));

    const result = await detectLoggingProfileDrift({
      esClient: client,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      profile,
      logger,
    });

    expect(result.refresh).toBe(false);
    expect(result.greps[0]).toMatchObject({ actual: 100, refresh: false });
  });

  it('a failed count query does NOT request refresh (INV-002)', async () => {
    const client = esClient();
    client.esql.query.mockRejectedValue(new Error('transport error'));

    const result = await detectLoggingProfileDrift({
      esClient: client,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      profile,
      logger,
    });

    // INV-002: a query failure is NOT a drop. The profile is kept; refresh stays false.
    expect(result.refresh).toBe(false);
    expect(result.greps[0]).toMatchObject({
      expected: 179,
      actual: -1,
      failed: true,
      error: 'transport error',
      refresh: false,
      reason: null,
    });
  });

  it('honours a custom driftRatio', async () => {
    const client = esClient();
    // 179 -> 160 is a ~10.6% drop; with a stricter 0.05 ratio this refreshes.
    client.esql.query.mockResolvedValue(statsResponse(160));

    const result = await detectLoggingProfileDrift({
      esClient: client,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      profile,
      driftRatio: 0.05,
      logger,
    });

    expect(result.refresh).toBe(true);
    expect(result.greps[0]).toMatchObject({ reason: 'ratio_drop' });
  });

  it('unions per-grep refresh flags across multiple greps', async () => {
    const client = esClient();
    const multiProfile: LoggingProfile = {
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
      generated_at: '2026-08-13T00:00:00.000Z',
      greps: [grep('.*log_error[(].*', 179), grep('.*maybe_log_error[(].*', 12)],
    };
    // First grep steady (179), second grep dropped to zero.
    client.esql.query
      .mockResolvedValueOnce(statsResponse(179))
      .mockResolvedValueOnce(statsResponse(0));

    const result = await detectLoggingProfileDrift({
      esClient: client,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      profile: multiProfile,
      logger,
    });

    expect(result.greps).toHaveLength(2);
    expect(result.greps[0].refresh).toBe(false);
    expect(result.greps[1].refresh).toBe(true);
    expect(result.refresh).toBe(true);
  });

  it('uses the parameterised ?regex binding (no string interpolation)', async () => {
    const client = esClient();
    client.esql.query.mockResolvedValue(statsResponse(179));

    await detectLoggingProfileDrift({
      esClient: client,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      profile,
      logger,
    });

    const [{ query, params }] = client.esql.query.mock.calls[0];
    expect(query).toContain('RLIKE ?regex');
    expect(params).toContainEqual({ regex: '.*log_error[(].*' });
  });
});
