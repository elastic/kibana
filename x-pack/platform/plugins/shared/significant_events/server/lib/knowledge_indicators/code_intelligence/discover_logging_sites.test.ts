/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { anchoredPhrasePatterns, LOGGER_IDIOM_PATTERNS, LOGGER_PHRASE_LEXICON } from './constants';
import { codeGrep, discoverLoggingSites, splitRepository } from './discover_logging_sites';

const COLUMNS = [
  { name: 'git.org', type: 'keyword' },
  { name: 'git.repo', type: 'keyword' },
  { name: 'git.commit', type: 'keyword' },
  { name: 'file.path', type: 'keyword' },
  { name: 'line.number', type: 'long' },
  { name: 'line.content', type: 'keyword' },
];

const WINDOW_COLUMNS = [
  { name: 'line.number', type: 'long' },
  { name: 'line.content', type: 'keyword' },
];

// grep calls issued when there are zero hits (no window fetch): one per idiom
// pattern + two (double- and single-quote anchored) per phrase-lexicon entry.
const GREP_CALLS = LOGGER_IDIOM_PATTERNS.length + LOGGER_PHRASE_LEXICON.length * 2;

// The window fetch is the only query that filters on an exact file.path (==) and
// a line.number range; grep patterns use RLIKE. Distinguish by the range clause.
const isWindowQuery = (query: string): boolean => query.includes('line.number >= ?lo');

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
  it('greps every idiom + anchored-phrase pattern, scoped to <serviceRoot>/**', async () => {
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

    // No hits -> no window fetch, so exactly one grep per pattern.
    expect(esClient.esql.query.mock.calls).toHaveLength(GREP_CALLS);
    for (const [{ params }] of esClient.esql.query.mock.calls) {
      expect(params).toContainEqual({ file_path: 'src/ad/**' });
      expect(params).toContainEqual({ git_commit: 'abc123' });
    }
    // an anchored double-quote phrase pattern is present.
    const [dq] = anchoredPhrasePatterns('[sS]tarted');
    const regexes = esClient.esql.query.mock.calls.flatMap(([{ params }]) =>
      (params as Array<Record<string, unknown>>).filter((p) => 'regex' in p).map((p) => p.regex)
    );
    expect(regexes).toContain(dq);
  });

  it('returns windowed candidates tagged by provenance, deduped by path:line', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation((async (req: { query: string }) => {
      if (isWindowQuery(req.query)) {
        return {
          columns: WINDOW_COLUMNS,
          values: [
            [41, 'logger.info('],
            [42, '"hi");'],
            [43, 'next();'],
          ],
        };
      }
      // every grep pattern returns the same idiom hit -> single deduped candidate.
      return { columns: COLUMNS, values: [row('src/ad/Main.java', 42, 'logger.info(')] };
    }) as unknown as typeof esClient.esql.query);

    const candidates = await discoverLoggingSites({
      esClient,
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
        via: 'idiom',
        language: 'Java',
      },
    ]);
  });

  it('never throws: a failing grep pattern is skipped and the rest still run', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    let firstGrep = true;
    esClient.esql.query.mockImplementation((async (req: { query: string }) => {
      if (isWindowQuery(req.query)) {
        return { columns: WINDOW_COLUMNS, values: [[7, 'console.error("boom");']] };
      }
      if (firstGrep) {
        firstGrep = false;
        throw new Error('bad regex');
      }
      return { columns: COLUMNS, values: [row('src/ad/Main.java', 7, 'console.error("boom");')] };
    }) as unknown as typeof esClient.esql.query);

    const candidates = await discoverLoggingSites({
      esClient,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src/ad',
      logger: loggerMock.create(),
    });

    expect(candidates).toEqual([
      {
        location: 'src/ad/Main.java:7',
        content: 'console.error("boom");',
        via: 'idiom',
        language: undefined,
      },
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
