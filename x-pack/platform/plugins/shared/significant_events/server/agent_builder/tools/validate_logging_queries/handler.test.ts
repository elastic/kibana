/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  validateLoggingQueriesHandler,
  OVER_CAPTURE_CEILING,
  type GrepCandidateInput,
  type GrepValidationStatus,
} from './handler';
import { createMockCodeboxClient } from '../../../lib/knowledge_indicators/code_intelligence/__mocks__/codebox_client';
import type { CodeboxGrepHit } from '../../../lib/knowledge_indicators/code_intelligence/codebox_client';

const logger = loggingSystemMock.createLogger();

const candidate = (
  regex: string,
  path = 'lib/realtime/logs.ex',
  line = 21
): GrepCandidateInput => ({
  regex,
  evidence: { path, line },
});

/** Creates N fake grep hits, optionally including the evidence line. */
const fakeHits = (
  count: number,
  options?: { evidencePath?: string; evidenceLine?: number }
): CodeboxGrepHit[] => {
  const hits: CodeboxGrepHit[] = [];
  for (let i = 0; i < count; i++) {
    hits.push({
      ref: 'abc',
      path: options?.evidencePath ?? `file${i}.ex`,
      lineNumber: options?.evidenceLine ?? i + 1,
      content: `log_error("msg ${i}")`,
    });
  }
  return hits;
};

/** Hits that include the evidence line at the specified position. */
const hitsWithEvidence = (
  total: number,
  evidencePath: string,
  evidenceLine: number
): CodeboxGrepHit[] => {
  const hits: CodeboxGrepHit[] = [];
  for (let i = 0; i < total; i++) {
    if (i === 0) {
      hits.push({
        ref: 'abc',
        path: evidencePath,
        lineNumber: evidenceLine,
        content: 'log_error("evidence")',
      });
    } else {
      hits.push({ ref: 'abc', path: `other${i}.ex`, lineNumber: i, content: `log_error("${i}")` });
    }
  }
  return hits;
};

describe('validateLoggingQueriesHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fails safely when the repository count response is invalid', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grepCount.mockRejectedValue(new Error('invalid grep count'));

    await expect(
      validateLoggingQueriesHandler({
        codebox,
        repository: 'supabase/realtime',
        gitCommit: 'f5abfb19445404',
        greps: [candidate('.*log_error[(].*')],
        logger,
      })
    ).rejects.toThrow('invalid grep count');
    expect(codebox.grep).not.toHaveBeenCalled();
  });

  it('reports pass when grep covers evidence and is under ceiling', async () => {
    const codebox = createMockCodeboxClient();
    // Total lines: 108873 so 179/108873 = 0.16% < 1% ceiling
    codebox.grepCount.mockResolvedValueOnce(108873).mockResolvedValueOnce(179);
    codebox.grep
      .mockResolvedValueOnce(hitsWithEvidence(1, 'lib/realtime/logs.ex', 21))
      .mockResolvedValueOnce(fakeHits(3));

    const output = await validateLoggingQueriesHandler({
      codebox,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      greps: [candidate('.*log_error[(].*')],
      logger,
    });

    expect(output.repo_total_lines).toBe(108873);
    expect(output.results).toHaveLength(1);
    expect(output.results[0]).toMatchObject({
      grep: '.*log_error[(].*',
      pass: true,
      hits: 179,
      covers_evidence: true,
      error: null,
      status: 'ok' as GrepValidationStatus,
    });
    expect(output.results[0].sample).toHaveLength(3);
    expect(codebox.grep).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'lib/realtime/logs.ex', maxCount: 1_000 })
    );
    expect(codebox.grep).toHaveBeenCalledWith(expect.objectContaining({ maxCount: 3 }));
    expect(codebox.grep).not.toHaveBeenCalledWith(
      expect.objectContaining({ pattern: '.', maxCount: 1_000_000 })
    );
  });

  it('reports evidence_missed when grep hits but misses the evidence line', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grepCount.mockResolvedValueOnce(108873).mockResolvedValueOnce(50);
    codebox.grep.mockResolvedValueOnce(fakeHits(1)).mockResolvedValueOnce(fakeHits(3));

    const output = await validateLoggingQueriesHandler({
      codebox,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      greps: [candidate('.*log_error[(].*')],
      logger,
    });

    expect(output.results[0]).toMatchObject({
      pass: false,
      covers_evidence: false,
      status: 'evidence_missed' as GrepValidationStatus,
    });
  });

  it('reports zero_hits when grep matches nothing', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grepCount.mockResolvedValueOnce(108873).mockResolvedValueOnce(0);
    codebox.grep.mockResolvedValueOnce([]);

    const output = await validateLoggingQueriesHandler({
      codebox,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      greps: [candidate('.*nonexistent.*')],
      logger,
    });

    expect(output.results[0]).toMatchObject({
      pass: false,
      hits: 0,
      status: 'zero_hits' as GrepValidationStatus,
      error: null,
    });
  });

  it('reports over_capture when hit_ratio >= ceiling', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grepCount.mockResolvedValueOnce(10000).mockResolvedValueOnce(200);
    codebox.grep.mockResolvedValueOnce(hitsWithEvidence(1, 'lib/realtime/logs.ex', 21));

    const output = await validateLoggingQueriesHandler({
      codebox,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      greps: [candidate('.*log.*')],
      ceiling: 0.01,
      logger,
    });

    expect(output.results[0]).toMatchObject({
      pass: false,
      covers_evidence: true,
      status: 'over_capture' as GrepValidationStatus,
    });
  });

  it('reports invalid_syntax on a bad regex (HTTP 400)', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grepCount
      .mockResolvedValueOnce(108873)
      .mockRejectedValueOnce(
        new Error('Codebox GET /repos/.../grep failed: HTTP 400 — invalid regex')
      );

    const output = await validateLoggingQueriesHandler({
      codebox,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      greps: [candidate('.*[invalid')],
      logger,
    });

    expect(output.results[0]).toMatchObject({
      pass: false,
      status: 'invalid_syntax' as GrepValidationStatus,
      error: expect.stringContaining('400'),
    });
  });

  it('reports query_failed on a transport error', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grepCount
      .mockResolvedValueOnce(108873)
      .mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const output = await validateLoggingQueriesHandler({
      codebox,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      greps: [candidate('.*log_error[(].*')],
      logger,
    });

    expect(output.results[0]).toMatchObject({
      pass: false,
      status: 'query_failed' as GrepValidationStatus,
      error: expect.stringContaining('ECONNREFUSED'),
    });
  });

  it('validates multiple greps independently', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grepCount
      .mockResolvedValueOnce(108873)
      .mockResolvedValueOnce(179)
      .mockResolvedValueOnce(0);
    codebox.grep
      .mockResolvedValueOnce(hitsWithEvidence(1, 'lib/realtime/logs.ex', 21))
      .mockResolvedValueOnce(fakeHits(3))
      .mockResolvedValueOnce([]);

    const output = await validateLoggingQueriesHandler({
      codebox,
      repository: 'supabase/realtime',
      gitCommit: 'f5abfb19445404',
      greps: [candidate('.*log_error[(].*'), candidate('.*nonexistent.*')],
      logger,
    });

    expect(output.results).toHaveLength(2);
    expect(output.results[0].pass).toBe(true);
    expect(output.results[1].pass).toBe(false);
  });

  it('OVER_CAPTURE_CEILING is the documented 1%', () => {
    expect(OVER_CAPTURE_CEILING).toBe(0.01);
  });
});
