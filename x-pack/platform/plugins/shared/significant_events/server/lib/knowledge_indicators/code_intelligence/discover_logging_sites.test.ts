/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { LOGGER_IDIOM_PATTERNS } from './constants';
import {
  codeGrep,
  discoverLoggingSites,
  fetchLineWindows,
  splitRepository,
} from './discover_logging_sites';
import { createMockCodeboxClient } from './__mocks__/codebox_client';

describe('splitRepository', () => {
  it('splits on the first slash', () => {
    expect(splitRepository('open-telemetry/opentelemetry-demo')).toEqual({
      org: 'open-telemetry',
      repo: 'opentelemetry-demo',
    });
  });

  it('keeps deeper paths intact on the repo side', () => {
    expect(splitRepository('org/group/repo')).toEqual({ org: 'org', repo: 'group/repo' });
  });

  it('falls back to a wildcard org when there is no slash', () => {
    expect(splitRepository('repo-only')).toEqual({ org: '*', repo: 'repo-only' });
  });
});

describe('codeGrep', () => {
  it('passes the scope + regex and maps to GrepLine[]', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockResolvedValue([
      {
        ref: 'abc123',
        path: 'src/ad/Main.java',
        lineNumber: 42,
        content: 'logger.info("started");',
      },
    ]);

    const lines = await codeGrep({
      codebox,
      gitOrg: 'open-telemetry',
      gitRepo: 'opentelemetry-demo',
      ref: 'abc123',
      filePath: 'src/ad/',
      regex: '.*logger[.]info.*',
      limit: 500,
    });

    expect(lines).toEqual([
      { filePath: 'src/ad/Main.java', lineNumber: 42, content: 'logger.info("started");' },
    ]);

    expect(codebox.grep).toHaveBeenCalledWith({
      org: 'open-telemetry',
      repo: 'opentelemetry-demo',
      ref: 'abc123',
      pattern: expect.any(String),
      path: 'src/ad/',
      maxCount: 500,
    });
  });

  it('returns [] when Codebox returns no matches', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockResolvedValue([]);

    const lines = await codeGrep({
      codebox,
      gitOrg: '*',
      gitRepo: '*',
      ref: 'abc123',
      regex: '.*x.*',
      limit: 10,
    });

    expect(lines).toEqual([]);
  });
});

describe('fetchLineWindows', () => {
  it('fetches a line range per file and returns a Map<file, Map<lineNumber, content>>', async () => {
    const codebox = createMockCodeboxClient();
    codebox.show.mockResolvedValue('line 41\nlogger.info("hi");\nnext();');

    const result = await fetchLineWindows({
      codebox,
      gitOrg: 'open-telemetry',
      gitRepo: 'opentelemetry-demo',
      ref: 'abc123',
      hitsByFile: new Map([['src/ad/Main.java', new Set([42])]]),
      logger: loggerMock.create(),
    });

    expect(result.has('src/ad/Main.java')).toBe(true);
    const fileLines = result.get('src/ad/Main.java')!;
    expect(fileLines.get(41)).toBe('line 41');
    expect(fileLines.get(42)).toBe('logger.info("hi");');
    expect(fileLines.get(43)).toBe('next();');
  });

  it('skips files that fail to fetch', async () => {
    const codebox = createMockCodeboxClient();
    codebox.show.mockRejectedValue(new Error('404'));

    const result = await fetchLineWindows({
      codebox,
      gitOrg: 'org',
      gitRepo: 'repo',
      ref: 'abc123',
      hitsByFile: new Map([['missing.ts', new Set([1])]]),
      logger: loggerMock.create(),
    });

    expect(result.size).toBe(0);
  });
});

describe('discoverLoggingSites', () => {
  it('greps every idiom pattern, scoped to serviceRoot', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockResolvedValue([]);

    await discoverLoggingSites({
      codebox,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src/ad',
      language: 'Java',
      logger: loggerMock.create(),
    });

    // One grep per idiom pattern
    expect(codebox.grep).toHaveBeenCalledTimes(LOGGER_IDIOM_PATTERNS.length);
    for (const call of codebox.grep.mock.calls) {
      expect(call[0].path).toBe('src/ad/');
      expect(call[0].ref).toBe('abc123');
    }
  });

  it('returns windowed candidates, deduped by path:line', async () => {
    const codebox = createMockCodeboxClient();
    // Every grep returns the same hit -> single deduped candidate
    codebox.grep.mockResolvedValue([
      { ref: 'abc123', path: 'src/ad/Main.java', lineNumber: 42, content: 'logger.info(' },
    ]);
    codebox.show.mockResolvedValue('logger.info(\n"hi");\nnext();');

    const candidates = await discoverLoggingSites({
      codebox,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src/ad',
      language: 'Java',
      logger: loggerMock.create(),
    });

    expect(candidates).toEqual([
      {
        location: 'src/ad/Main.java:42',
        content: 'logger.info(\n"hi");\nnext();',
        language: 'Java',
      },
    ]);
  });

  it('drops grep hits in test/build/shell paths before they become candidates', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockResolvedValue([
      { ref: 'abc123', path: 'src/ad/Main.java', lineNumber: 42, content: 'logger.info("hi")' },
      {
        ref: 'abc123',
        path: 'src/ad/Main.test.java',
        lineNumber: 10,
        content: 'logger.info("hi")',
      },
      { ref: 'abc123', path: 'scripts/deploy.sh', lineNumber: 5, content: 'echo "Error: boom"' },
      { ref: 'abc123', path: 'o11y/Makefile', lineNumber: 62, content: 'echo "Error: usage"' },
    ]);
    codebox.show.mockResolvedValue('logger.info("hi")');

    const candidates = await discoverLoggingSites({
      codebox,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src/ad',
      language: 'Java',
      logger: loggerMock.create(),
    });

    // Only the production-source hit survives
    expect(candidates.map((c) => c.location)).toEqual(['src/ad/Main.java:42']);
  });

  it('warns at the per-pattern limit but not below it', async () => {
    const codebox = createMockCodeboxClient();
    const logger = loggerMock.create();
    let first = true;
    codebox.grep.mockImplementation(async () => {
      if (first) {
        first = false;
        return [
          { ref: 'abc123', path: 'src/main.ts', lineNumber: 7, content: 'console.error("boom")' },
        ];
      }
      return [];
    });
    codebox.show.mockResolvedValue('console.error("boom")');

    await discoverLoggingSites({
      codebox,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src',
      logger,
      perPatternLimit: 1,
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('limit 1'));
  });

  it('runs every idiom and evenly samples the aggregate candidate set', async () => {
    const codebox = createMockCodeboxClient();
    const logger = loggerMock.create();
    let call = 0;
    codebox.grep.mockImplementation(async () => {
      const path = `src/file-${call++}.ts`;
      return [{ ref: 'abc123', path, lineNumber: 1, content: 'logger.info("hi")' }];
    });
    codebox.show.mockResolvedValue('logger.info("hi")');

    const candidates = await discoverLoggingSites({
      codebox,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src',
      logger,
      maxCandidates: 2,
    });

    expect(codebox.grep).toHaveBeenCalledTimes(LOGGER_IDIOM_PATTERNS.length);
    expect(candidates.map(({ location }) => location)).toEqual([
      'src/file-0.ts:1',
      `src/file-${Math.floor(LOGGER_IDIOM_PATTERNS.length / 2)}.ts:1`,
    ]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('sampled 2 of'));
  });

  it('drops hits whose own line cannot emit', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockResolvedValue([
      // non-emitting: declaration
      {
        ref: 'abc123',
        path: 'src/logger.ts',
        lineNumber: 1,
        content: 'const logger = getLogger("app");',
      },
      // emitting: actual log call
      { ref: 'abc123', path: 'src/app.ts', lineNumber: 10, content: 'logger.info("started");' },
    ]);
    codebox.show.mockImplementation(async ({ path }: { path: string }) => {
      if (path === 'src/logger.ts') return 'const logger = getLogger("app");';
      return 'logger.info("started");';
    });

    const candidates = await discoverLoggingSites({
      codebox,
      repository: 'org/repo',
      gitSha: 'abc',
      serviceRoot: 'src',
      logger: loggerMock.create(),
    });

    // Only the emitting line survives
    const locations = candidates.map((c) => c.location);
    expect(locations).toContain('src/app.ts:10');
    expect(locations).not.toContain('src/logger.ts:1');
  });

  it('merges profile greps alongside idiom greps (additive)', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockResolvedValue([]);
    codebox.show.mockResolvedValue('');

    await discoverLoggingSites({
      codebox,
      repository: 'org/repo',
      gitSha: 'abc',
      serviceRoot: 'src',
      logger: loggerMock.create(),
      profileGreps: ['.*my_custom_logger.*'],
    });

    // idiom patterns + 1 profile grep
    expect(codebox.grep).toHaveBeenCalledTimes(LOGGER_IDIOM_PATTERNS.length + 1);
  });

  it('skips profile greps when useLoggingProfile is false', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockResolvedValue([]);

    await discoverLoggingSites({
      codebox,
      repository: 'org/repo',
      gitSha: 'abc',
      serviceRoot: 'src',
      logger: loggerMock.create(),
      profileGreps: ['.*my_custom_logger.*'],
      useLoggingProfile: false,
    });

    expect(codebox.grep).toHaveBeenCalledTimes(LOGGER_IDIOM_PATTERNS.length);
  });
});
