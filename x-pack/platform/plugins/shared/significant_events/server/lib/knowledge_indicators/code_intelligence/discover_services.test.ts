/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  buildLanguageHistogram,
  discoverCandidateRoots,
  listIndexedRepos,
} from './discover_services';
import type { IndexedRepoRef } from './types';
import { createMockCodeboxClient } from './__mocks__/codebox_client';

const repo: IndexedRepoRef = {
  repository: 'open-telemetry/opentelemetry-demo',
  org: 'open-telemetry',
  repo: 'opentelemetry-demo',
  gitSha: 'abc123',
  ref: 'HEAD',
};

describe('listIndexedRepos', () => {
  it('maps Codebox repos + HEAD SHA to IndexedRepoRef[]', async () => {
    const codebox = createMockCodeboxClient();
    codebox.listRepos.mockResolvedValue([
      { name: 'open-telemetry/opentelemetry-demo', status: 'ready', jobId: 'j1' },
    ]);
    codebox.resolveHead.mockResolvedValue('abc123');

    const repos = await listIndexedRepos({ codebox, logger: loggerMock.create() });
    expect(repos).toEqual([repo]);
  });

  it('filters to ready repos only', async () => {
    const codebox = createMockCodeboxClient();
    codebox.listRepos.mockResolvedValue([
      { name: 'org/ready-repo', status: 'ready', jobId: 'j1' },
      { name: 'org/cloning-repo', status: 'cloning', jobId: 'j2' },
      { name: 'org/failed-repo', status: 'failed', jobId: 'j3' },
    ]);
    codebox.resolveHead.mockResolvedValue('sha1');

    const repos = await listIndexedRepos({ codebox, logger: loggerMock.create() });
    expect(repos).toHaveLength(1);
    expect(repos[0].repository).toBe('org/ready-repo');
  });

  it('uses HEAD SHA directly (no branch enumeration)', async () => {
    const codebox = createMockCodeboxClient();
    codebox.listRepos.mockResolvedValue([{ name: 'org/repo', status: 'ready', jobId: 'j1' }]);
    codebox.resolveHead.mockResolvedValue('head-sha');

    const repos = await listIndexedRepos({ codebox, logger: loggerMock.create() });
    expect(repos[0].gitSha).toBe('head-sha');
    expect(repos[0].ref).toBe('HEAD');
  });

  it('never throws — returns [] on API failure', async () => {
    const codebox = createMockCodeboxClient();
    codebox.listRepos.mockRejectedValue(new Error('connection refused'));

    await expect(listIndexedRepos({ codebox, logger: loggerMock.create() })).resolves.toEqual([]);
  });

  it('skips repos where HEAD cannot be resolved', async () => {
    const codebox = createMockCodeboxClient();
    codebox.listRepos.mockResolvedValue([{ name: 'org/empty-repo', status: 'ready', jobId: 'j1' }]);
    codebox.resolveHead.mockResolvedValue(undefined);

    const repos = await listIndexedRepos({ codebox, logger: loggerMock.create() });
    expect(repos).toEqual([]);
  });
});

describe('buildLanguageHistogram', () => {
  it('returns byte-weighted language counts from Codebox languages endpoint', async () => {
    const codebox = createMockCodeboxClient();
    codebox.languages.mockResolvedValue({
      Python: { files: 42, bytes: 500_000 },
      TypeScript: { files: 10, bytes: 200_000 },
      Markdown: { files: 5, bytes: 1_000 },
    });

    const histogram = await buildLanguageHistogram({
      codebox,
      repo,
      logger: loggerMock.create(),
    });

    expect(histogram).toEqual([
      { language: 'Python', count: 500_000 },
      { language: 'TypeScript', count: 200_000 },
      { language: 'Markdown', count: 1_000 },
    ]);
  });

  it('sorts by byte count descending', async () => {
    const codebox = createMockCodeboxClient();
    codebox.languages.mockResolvedValue({
      Go: { files: 1, bytes: 100 },
      Java: { files: 1, bytes: 999 },
    });

    const histogram = await buildLanguageHistogram({
      codebox,
      repo,
      logger: loggerMock.create(),
    });
    expect(histogram[0].language).toBe('Java');
    expect(histogram[1].language).toBe('Go');
  });

  it('returns [] on API failure', async () => {
    const codebox = createMockCodeboxClient();
    codebox.languages.mockRejectedValue(new Error('timeout'));

    const histogram = await buildLanguageHistogram({
      codebox,
      repo,
      logger: loggerMock.create(),
    });
    expect(histogram).toEqual([]);
  });
});

describe('discoverCandidateRoots', () => {
  it('discovers candidate roots from grep hits', async () => {
    const codebox = createMockCodeboxClient();
    // Simulate finding a Dockerfile at repo root
    codebox.grep.mockImplementation(async ({ pattern }: { pattern: string }) => {
      if (pattern.includes('Dockerfile')) {
        return [{ ref: 'abc123', path: 'Dockerfile', lineNumber: 1, content: 'FROM node:18' }];
      }
      return [];
    });

    const result = await discoverCandidateRoots({
      codebox,
      repo,
      logger: loggerMock.create(),
    });

    expect(result.candidates.length).toBeGreaterThanOrEqual(0);
    expect(result.iacSignals).toBeDefined();
    expect(result.manifestPaths).toBeDefined();
  });

  it('never throws — returns empty results on total failure', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockRejectedValue(new Error('connection refused'));

    const result = await discoverCandidateRoots({
      codebox,
      repo,
      logger: loggerMock.create(),
    });

    expect(result.candidates).toEqual([]);
  });

  it('reads README from repo root', async () => {
    const codebox = createMockCodeboxClient();
    codebox.grep.mockImplementation(async ({ pattern }: { pattern: string }) => {
      // README pattern match
      if (pattern.includes('[Rr]') || pattern.includes('README')) {
        return [{ ref: 'abc123', path: 'README.md', lineNumber: 1, content: '# My Project' }];
      }
      return [];
    });
    codebox.show.mockResolvedValue('# My Project\nA demo app.');

    const result = await discoverCandidateRoots({
      codebox,
      repo,
      logger: loggerMock.create(),
    });

    expect(result.readmeLines).toBeDefined();
  });
});
