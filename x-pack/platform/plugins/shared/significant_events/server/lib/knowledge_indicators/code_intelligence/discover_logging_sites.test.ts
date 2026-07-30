/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { LOGGER_IDIOM_PATTERNS } from './constants';
import { codeGrep, discoverLoggingSites, splitRepository } from './discover_logging_sites';

const COLUMNS = [
  { name: 'git.org', type: 'keyword' },
  { name: 'git.repo', type: 'keyword' },
  { name: 'git.commit', type: 'keyword' },
  { name: 'file.path', type: 'keyword' },
  { name: 'line.number', type: 'long' },
  { name: 'line.content', type: 'keyword' },
];

const row = (path: string, line: number, content: string) => [
  'open-telemetry',
  'opentelemetry-demo',
  'abc123',
  path,
  line,
  content,
];

describe('splitRepository', () => {
  it('splits "org/repo" into org and repo', () => {
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
  it('passes the scope + regex as named params and maps rows to GrepLine[]', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({
      columns: COLUMNS,
      values: [row('src/ad/Main.java', 42, 'logger.info("started");')],
    });

    const lines = await codeGrep({
      esClient,
      gitOrg: 'open-telemetry',
      gitRepo: 'opentelemetry-demo',
      gitCommit: 'abc123',
      filePath: 'src/ad/**',
      regex: '.*logger[.]info.*',
      limit: 500,
    });

    expect(lines).toEqual([
      { filePath: 'src/ad/Main.java', lineNumber: 42, content: 'logger.info("started");' },
    ]);

    const call = esClient.esql.query.mock.calls[0][0];
    expect(call.query).toContain('FROM sourcerer-v1-lines*');
    expect(call.query).toContain('line.content RLIKE ?regex');
    expect(call.params).toEqual([
      { git_org: 'open-telemetry' },
      { git_repo: 'opentelemetry-demo' },
      { git_commit: 'abc123' },
      { file_path: 'src/ad/**' },
      { regex: '.*logger[.]info.*' },
    ]);
  });

  it('returns [] when expected columns are missing', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] });

    await expect(
      codeGrep({
        esClient,
        gitOrg: '*',
        gitRepo: '*',
        gitCommit: '*',
        filePath: '**',
        regex: '.*x.*',
        limit: 10,
      })
    ).resolves.toEqual([]);
  });
});

describe('discoverLoggingSites', () => {
  it('runs one grep per idiom pattern, scoped to <serviceRoot>/**', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: COLUMNS, values: [] });

    await discoverLoggingSites({
      esClient,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src/ad',
      language: 'Java',
      logger: loggerMock.create(),
    });

    expect(esClient.esql.query.mock.calls).toHaveLength(LOGGER_IDIOM_PATTERNS.length);
    for (const [{ params }] of esClient.esql.query.mock.calls) {
      expect(params).toContainEqual({ file_path: 'src/ad/**' });
      expect(params).toContainEqual({ git_commit: 'abc123' });
    }
  });

  it('deduplicates matches by path:line across patterns and carries the language', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    // Every pattern returns the same line — must collapse to a single chunk.
    esClient.esql.query.mockResolvedValue({
      columns: COLUMNS,
      values: [row('src/ad/Main.java', 42, 'logger.info("hi");')],
    });

    const chunks = await discoverLoggingSites({
      esClient,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src/ad',
      language: 'Java',
      logger: loggerMock.create(),
    });

    expect(chunks).toEqual([
      { content: 'logger.info("hi");', language: 'Java', location: 'src/ad/Main.java:42' },
    ]);
  });

  it('never throws: a failing pattern is skipped and the rest still run', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockRejectedValueOnce(new Error('bad regex')).mockResolvedValue({
      columns: COLUMNS,
      values: [row('src/ad/Main.java', 7, 'console.error("boom");')],
    });

    const chunks = await discoverLoggingSites({
      esClient,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src/ad',
      logger: loggerMock.create(),
    });

    expect(chunks).toEqual([
      { content: 'console.error("boom");', language: undefined, location: 'src/ad/Main.java:7' },
    ]);
  });

  it('greps the whole repo (**) when the service root is empty', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: COLUMNS, values: [] });

    await discoverLoggingSites({
      esClient,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: '',
      logger: loggerMock.create(),
    });

    for (const [{ params }] of esClient.esql.query.mock.calls) {
      expect(params).toContainEqual({ file_path: '**' });
    }
  });
});
