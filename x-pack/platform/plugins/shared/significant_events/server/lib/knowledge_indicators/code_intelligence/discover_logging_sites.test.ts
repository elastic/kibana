/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  anchoredPhrasePatterns,
  isExcludedLoggingPath,
  LOGGER_IDIOM_PATTERNS,
  LOGGER_PHRASE_LEXICON,
  SENTENCE_LITERAL_PATTERNS,
} from './constants';
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

// grep calls issued when there are zero hits (no window fetch): one per idiom,
// three quote variants per phrase, and one per sentence-literal quote style.
const GREP_CALLS =
  LOGGER_IDIOM_PATTERNS.length +
  LOGGER_PHRASE_LEXICON.length * 3 +
  SENTENCE_LITERAL_PATTERNS.length;

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

describe('logging-site patterns', () => {
  it('matches the added logger idioms without matching unrelated properties', () => {
    const [uppercaseLogger, microsoftLogger, javaStreams] = LOGGER_IDIOM_PATTERNS.slice(-3).map(
      (pattern) => new RegExp(`^${pattern}$`)
    );
    expect(uppercaseLogger.test('LOG.error("boom");')).toBe(true);
    expect(uppercaseLogger.test('catalog.info = parse(x);')).toBe(false);
    expect(microsoftLogger.test('_logger.LogError("boom");')).toBe(true);
    expect(microsoftLogger.test('logger.LogInformation("hi");')).toBe(true);
    expect(javaStreams.test('System.out.println("hi");')).toBe(true);
  });

  it('anchors phrases inside all 3 quote styles', () => {
    const patterns = anchoredPhrasePatterns('[fF]ailed to');
    expect(patterns).toHaveLength(3);
    const backtick = new RegExp(`^${patterns[2]}$`);
    expect(backtick.test('const m = `Failed to load ${x}`;')).toBe(true);
    expect(backtick.test('const m = "unrelated";')).toBe(false);
  });

  it('matches sentence-shaped double-quoted literals only', () => {
    const doubleQuoted = new RegExp(`^${SENTENCE_LITERAL_PATTERNS[0]}$`);
    expect(doubleQuoted.test('return errors.New("failed connecting to database backend")')).toBe(
      true
    );
    expect(doubleQuoted.test('log("order shipped to customer")')).toBe(true);
    expect(doubleQuoted.test('x := "singleword"')).toBe(false);
    expect(doubleQuoted.test('key = "a.b.c_d"')).toBe(false);
  });
});

describe('isExcludedLoggingPath', () => {
  it('excludes test files and test directories', () => {
    expect(isExcludedLoggingPath('src/foo/bar.test.ts')).toBe(true);
    expect(isExcludedLoggingPath('src/foo/bar.spec.ts')).toBe(true);
    expect(isExcludedLoggingPath('pkg/handler_test.go')).toBe(true);
    expect(isExcludedLoggingPath('src/__tests__/thing.ts')).toBe(true);
    expect(isExcludedLoggingPath('test/fixtures/data.go')).toBe(true);
    expect(isExcludedLoggingPath('e2e/login.ts')).toBe(true);
  });

  it('excludes build/CI tooling files', () => {
    expect(isExcludedLoggingPath('Makefile')).toBe(true);
    expect(isExcludedLoggingPath('o11y/Makefile')).toBe(true);
    expect(isExcludedLoggingPath('build.mk')).toBe(true);
    expect(isExcludedLoggingPath('Dockerfile')).toBe(true);
    expect(isExcludedLoggingPath('.buildkite/scripts/bootstrap.sh')).toBe(true);
    expect(isExcludedLoggingPath('.github/workflows/ci.yml')).toBe(true);
    expect(isExcludedLoggingPath('build.gradle')).toBe(true);
    expect(isExcludedLoggingPath('gradle/wrapper/x.properties')).toBe(true);
  });

  it('excludes shell scripts wholesale (terminal output, not service logs)', () => {
    expect(isExcludedLoggingPath('scripts/util.sh')).toBe(true);
    expect(
      isExcludedLoggingPath('x-pack/.../observability_onboarding/public/assets/auto_detect.sh')
    ).toBe(true);
    expect(isExcludedLoggingPath('tools/setup.bash')).toBe(true);
  });

  it('excludes JVM test classes outside a /test/ dir (camelCase boundary)', () => {
    expect(
      isExcludedLoggingPath(
        'modules/reindex/src/internalClusterTest/java/org/elasticsearch/BulkTests.java'
      )
    ).toBe(true);
    expect(isExcludedLoggingPath('server/src/main/java/org/elasticsearch/FooTest.java')).toBe(true);
    expect(isExcludedLoggingPath('x/src/GcsProxyIntegrationIT.java')).toBe(true);
    expect(isExcludedLoggingPath('x/AzureRepositoryIntegTests.java')).toBe(true);
    expect(isExcludedLoggingPath('svc/HandlerTests.kt')).toBe(true);
    // internalClusterTest / yamlRestTest source-set dirs.
    expect(isExcludedLoggingPath('modules/x/src/yamlRestTest/java/org/x/Thing.java')).toBe(true);
  });

  it('keeps production application source', () => {
    expect(isExcludedLoggingPath('src/ad/Main.java')).toBe(false);
    expect(isExcludedLoggingPath('server/http_server.ts')).toBe(false);
    expect(isExcludedLoggingPath('cmd/service/main.go')).toBe(false);
    // "latest" contains "test" but is not a test path segment/suffix.
    expect(isExcludedLoggingPath('src/latest/handler.ts')).toBe(false);
    // Case-sensitive JVM guard: `Latest.java` / `Manifest.java` are not tests.
    expect(isExcludedLoggingPath('server/src/main/java/org/x/Latest.java')).toBe(false);
    expect(isExcludedLoggingPath('server/src/main/java/org/x/Manifest.java')).toBe(false);
  });
});

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
    expect(call.query).toContain('FROM sourcerer-v1-lines*,sourcerer-v2-lines*');
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

  it('drops grep hits in test/build/shell paths before they become candidates', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation((async (req: { query: string }) => {
      if (isWindowQuery(req.query)) {
        return { columns: WINDOW_COLUMNS, values: [[42, 'logger.info("hi")']] };
      }
      // Each grep returns one real hit and three excluded-path hits.
      return {
        columns: COLUMNS,
        values: [
          row('src/ad/Main.java', 42, 'logger.info("hi")'),
          row('src/ad/Main.test.java', 10, 'logger.info("hi")'),
          row('scripts/deploy.sh', 5, 'echo "Error: boom"'),
          row('o11y/Makefile', 62, 'echo "Error: usage"'),
        ],
      };
    }) as unknown as typeof esClient.esql.query);

    const candidates = await discoverLoggingSites({
      esClient,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src/ad',
      language: 'Java',
      logger: loggerMock.create(),
    });

    // Only the production-source hit survives; test/shell/Makefile are excluded.
    expect(candidates.map((c) => c.location)).toEqual(['src/ad/Main.java:42']);
  });

  it('tags sentence-literal-only hits as phrase candidates', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation((async (req: {
      query: string;
      params?: Array<Record<string, unknown>>;
    }) => {
      if (isWindowQuery(req.query)) {
        return { columns: WINDOW_COLUMNS, values: [[7, 'log("order shipped to customer")']] };
      }
      const regex = req.params?.find((param) => 'regex' in param)?.regex;
      if (regex === SENTENCE_LITERAL_PATTERNS[0]) {
        return {
          columns: COLUMNS,
          values: [row('src/orders/main.go', 7, 'log("order shipped to customer")')],
        };
      }
      return { columns: COLUMNS, values: [] };
    }) as unknown as typeof esClient.esql.query);

    const candidates = await discoverLoggingSites({
      esClient,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src/orders',
      logger: loggerMock.create(),
    });

    expect(candidates).toEqual([
      expect.objectContaining({ location: 'src/orders/main.go:7', via: 'phrase' }),
    ]);
  });

  it('warns at the per-pattern limit but not below it', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggerMock.create();
    let first = true;
    esClient.esql.query.mockImplementation((async (req: { query: string }) => {
      if (isWindowQuery(req.query)) {
        return { columns: WINDOW_COLUMNS, values: [[7, 'console.error("boom")']] };
      }
      if (first) {
        first = false;
        return { columns: COLUMNS, values: [row('src/main.ts', 7, 'console.error("boom")')] };
      }
      return { columns: COLUMNS, values: [] };
    }) as unknown as typeof esClient.esql.query);

    await discoverLoggingSites({
      esClient,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src',
      logger,
      perPatternLimit: 1,
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(LOGGER_IDIOM_PATTERNS[0]));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('limit 1'));

    const belowLimitLogger = loggerMock.create();
    const belowLimitClient = elasticsearchServiceMock.createElasticsearchClient();
    belowLimitClient.esql.query.mockResolvedValue({ columns: COLUMNS, values: [] });
    await discoverLoggingSites({
      esClient: belowLimitClient,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src',
      logger: belowLimitLogger,
      perPatternLimit: 1,
    });
    expect(belowLimitLogger.warn).not.toHaveBeenCalled();
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
