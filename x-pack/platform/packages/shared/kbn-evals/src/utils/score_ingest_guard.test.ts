/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertScoreIngestLanded,
  describeScoreIngestTargetHost,
  isGoldenScoreIngestConfigured,
  shouldEnforceGoldenScoreIngest,
} from './score_ingest_guard';

describe('score_ingest_guard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.KBN_EVALS;
    delete process.env.BUILDKITE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('detects when golden ingest URL is configured', () => {
    expect(isGoldenScoreIngestConfigured(undefined)).toBe(false);
    expect(isGoldenScoreIngestConfigured('   ')).toBe(false);
    expect(
      isGoldenScoreIngestConfigured('https://kbn-evals-serverless-ed035a.kb.us-central1.gcp.elastic.cloud')
    ).toBe(true);
  });

  it('describes golden host without exposing secrets', () => {
    expect(describeScoreIngestTargetHost(undefined)).toContain('EVALUATIONS_KBN_URL unset');
    expect(
      describeScoreIngestTargetHost(
        'https://kbn-evals-serverless-ed035a.kb.us-central1.gcp.elastic.cloud'
      )
    ).toBe('kbn-evals-serverless-ed035a.kb.us-central1.gcp.elastic.cloud');
  });

  it('enforces landed scores only in CI contexts by default', () => {
    expect(shouldEnforceGoldenScoreIngest()).toBe(false);

    process.env.KBN_EVALS = '1';
    expect(shouldEnforceGoldenScoreIngest()).toBe(true);
  });

  it('throws when CI ingest reports zero landed documents', () => {
    process.env.KBN_EVALS = '1';

    expect(() =>
      assertScoreIngestLanded([{ ingested: 0, conflicted: 0, failed: [] }])
    ).toThrow(/no landed documents/);
  });

  it('does not throw when at least one score landed', () => {
    process.env.KBN_EVALS = '1';

    expect(() =>
      assertScoreIngestLanded([{ ingested: 1, conflicted: 0, failed: [] }])
    ).not.toThrow();
  });

  it('does not throw for zero landed outside CI unless enforce is set', () => {
    expect(() =>
      assertScoreIngestLanded([{ ingested: 0, conflicted: 0, failed: [] }])
    ).not.toThrow();
  });
});
