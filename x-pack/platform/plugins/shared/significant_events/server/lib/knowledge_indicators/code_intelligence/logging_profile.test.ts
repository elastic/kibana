/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
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
import { createMockCodeboxClient } from './__mocks__/codebox_client';

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
    const feature = operations[0].index.feature;
    expect(feature.type).toBe(CODE_ANALYSIS_FEATURE_TYPE);
    expect(feature.subtype).toBe(CODE_FEATURE_SUBTYPE_LOGGING_PROFILE);
    expect(feature.properties.greps).toHaveLength(2);
    expect(feature.properties.greps[0].regex).toBe('.*log_error[(].*');
    expect(feature.properties.greps[0].expect_call_sites).toBe(179);
  });

  it('rejects greps whose hit ratio >= OVER_CAPTURE_CEILING (INV-006)', async () => {
    await expect(
      writeLoggingProfile({
        kiClient,
        spaceId: 'default',
        repository: 'supabase/realtime',
        commit: 'f5abfb19445404',
        greps: [grep('.*log.*', 1695)],
        repoTotalLines: REPO_TOTAL_LINES,
        runId: 'run-1',
        logger,
      })
    ).rejects.toThrow(LoggingProfileValidationError);
    expect(kiClient.bulk).not.toHaveBeenCalled();
  });

  it('accepts an empty greps list (valid — repo has no house wrapper)', async () => {
    await writeLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
      greps: [],
      repoTotalLines: REPO_TOTAL_LINES,
      runId: 'run-1',
      logger,
    });

    expect(kiClient.bulk).toHaveBeenCalledTimes(1);
  });
});

describe('readLoggingProfile', () => {
  it('round-trips a profile through write + read', async () => {
    const bulk = jest.fn().mockResolvedValue(undefined);
    const kiClient = {
      getFeatures: jest.fn().mockResolvedValue({
        hits: [
          {
            id: 'logging_profile',
            type: CODE_ANALYSIS_FEATURE_TYPE,
            subtype: CODE_FEATURE_SUBTYPE_LOGGING_PROFILE,
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
            },
            confidence: 100,
          },
        ],
      }),
      bulk,
    } as unknown as KnowledgeIndicatorClient;

    const profile = await readLoggingProfile({
      kiClient,
      spaceId: 'default',
      repository: 'supabase/realtime',
    });

    expect(profile).toMatchObject({
      repository: 'supabase/realtime',
      greps: [{ regex: '.*log_error[(].*', expect_call_sites: 179 }],
    });
  });

  it('returns undefined when no profile feature exists', async () => {
    const kiClient = {
      getFeatures: jest.fn().mockResolvedValue({ hits: [] }),
      bulk: jest.fn(),
    } as unknown as KnowledgeIndicatorClient;

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
    expect(OVER_CAPTURE_CEILING).toBe(0.01);
    expect(1695 / 108873).toBeGreaterThanOrEqual(OVER_CAPTURE_CEILING);
    expect(179 / 108873).toBeLessThan(OVER_CAPTURE_CEILING);
  });
});

describe('detectLoggingProfileDrift', () => {
  const logger = loggingSystemMock.createLogger();

  const profile: LoggingProfile = {
    repository: 'supabase/realtime',
    commit: 'f5abfb19445404',
    generated_at: '2026-08-13T00:00:00.000Z',
    greps: [grep('.*log_error[(].*', 179)],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('steady count does NOT request refresh', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grepCount.mockResolvedValue(179);

    const result = await detectLoggingProfileDrift({
      codebox,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      profile,
      logger,
    });

    expect(result.refresh).toBe(false);
    expect(result.greps).toHaveLength(1);
    expect(codebox.grepCount).toHaveBeenCalledWith(
      expect.objectContaining({ pattern: 'log_error[(]' })
    );
    expect(codebox.grep).not.toHaveBeenCalled();
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
    const codebox = createMockCodeboxClient();
    codebox.grepCount.mockResolvedValue(0);

    const result = await detectLoggingProfileDrift({
      codebox,
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
    const codebox = createMockCodeboxClient();
    codebox.grepCount.mockResolvedValue(50);

    const result = await detectLoggingProfileDrift({
      codebox,
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
    const codebox = createMockCodeboxClient();
    codebox.grepCount.mockResolvedValue(100);

    const result = await detectLoggingProfileDrift({
      codebox,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      profile,
      logger,
    });

    expect(result.refresh).toBe(false);
    expect(result.greps[0]).toMatchObject({ actual: 100, refresh: false });
  });

  it('a failed count query does NOT request refresh (INV-002)', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grepCount.mockRejectedValue(new Error('transport error'));

    const result = await detectLoggingProfileDrift({
      codebox,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      profile,
      logger,
    });

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
    const codebox = createMockCodeboxClient();
    codebox.grepCount.mockResolvedValue(160);

    const result = await detectLoggingProfileDrift({
      codebox,
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
    const codebox = createMockCodeboxClient();
    const multiProfile: LoggingProfile = {
      repository: 'supabase/realtime',
      commit: 'f5abfb19445404',
      generated_at: '2026-08-13T00:00:00.000Z',
      greps: [grep('.*log_error[(].*', 179), grep('.*maybe_log_error[(].*', 12)],
    };
    codebox.grepCount.mockResolvedValueOnce(179).mockResolvedValueOnce(0);

    const result = await detectLoggingProfileDrift({
      codebox,
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
});
