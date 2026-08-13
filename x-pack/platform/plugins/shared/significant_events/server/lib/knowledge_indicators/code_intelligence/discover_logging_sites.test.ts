/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { isExcludedLoggingPath, isNonEmittingLine, LOGGER_IDIOM_PATTERNS } from './constants';
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

// grep calls issued when there are zero hits (no window fetch): one per idiom.
const GREP_CALLS = LOGGER_IDIOM_PATTERNS.length;

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
  const matcher = (pattern: string) => new RegExp(`^${pattern}$`);

  const matchesAnyIdiom = (line: string): boolean =>
    LOGGER_IDIOM_PATTERNS.some((pattern) => matcher(pattern).test(line));
  // Look patterns up by their distinguishing token rather than by index, so
  // adding a pattern cannot silently repoint an assertion at the wrong regex.
  const patternContaining = (token: string) => {
    const found = LOGGER_IDIOM_PATTERNS.filter((pattern) => pattern.includes(token));
    expect(found).toHaveLength(1);
    return matcher(found[0]);
  };

  it('matches the logger idioms without matching unrelated properties', () => {
    const uppercaseLogger = patternContaining('(LOG|LOGGER)');
    const microsoftLogger = patternContaining('Log(Trace');
    const javaStreams = patternContaining('System[.]');
    expect(uppercaseLogger.test('LOG.error("boom");')).toBe(true);
    expect(uppercaseLogger.test('catalog.info = parse(x);')).toBe(false);
    expect(microsoftLogger.test('_logger.LogError("boom");')).toBe(true);
    expect(microsoftLogger.test('logger.LogInformation("hi");')).toBe(true);
    expect(javaStreams.test('System.out.println("hi");')).toBe(true);
  });

  it('matches process-aborting emits that print their own message', () => {
    expect(patternContaining('panic[(]').test('panic("unable to start server")')).toBe(true);
    expect(patternContaining('panic![(]').test('panic!("error when parsing uuid");')).toBe(true);
    expect(patternContaining('eprintln').test('eprintln!("failed to bind: {}", err);')).toBe(true);
    const rustExpect = patternContaining('[.]expect[(]');
    expect(rustExpect.test('let cfg = load().expect("config is required");')).toBe(true);
    expect(rustExpect.test('expect(result).toBe(true);')).toBe(false);
  });

  it('does not match value-returning error constructors', () => {
    expect(matchesAnyIdiom('return fmt.Errorf("failed to charge card: %+v", err)')).toBe(false);
    expect(matchesAnyIdiom('return errors.New("failed connecting to database")')).toBe(false);
    expect(matchesAnyIdiom('throw new RpcException("Can\'t access cart storage.")')).toBe(false);
  });

  it('matches chained builder calls where the level is not adjacent to the logger', () => {
    expect(matchesAnyIdiom('logrus.WithField("id", id).Error("charge failed")')).toBe(true);
    expect(matchesAnyIdiom('logger.bind(order=id).error("charge failed")')).toBe(true);
    expect(matchesAnyIdiom('this.logger.get("billing").debug("x");')).toBe(true);
    expect(matchesAnyIdiom('col.service.Logger().Error("boom", zap.Error(err))')).toBe(true);
  });

  it('requires `log` to start an identifier, so catalog/backlog chains do not match', () => {
    const chained = patternContaining('[^;]*');
    const accessor = patternContaining('[(][)][.]');
    expect(chained.test('productCatalogService.Client.Info(ctx, req)')).toBe(false);
    expect(chained.test('catalogService.metrics.Error(err)')).toBe(false);
    expect(chained.test('topology.Node.Info(x)')).toBe(false);
    expect(accessor.test('getCatalog().Error(x)')).toBe(false);
    expect(accessor.test('backlog().Debug(x)')).toBe(false);
    // The chain may not span a statement boundary.
    expect(chained.test('logger = build(); other.Error(x)')).toBe(false);
  });

  it('matches go-kit, zerolog, and the Laravel facade', () => {
    expect(matchesAnyIdiom('level.Error(logger).Log("msg", "charge failed", "err", err)')).toBe(
      true
    );
    expect(matchesAnyIdiom('level.Debug(util_log.Logger).Log(')).toBe(true);
    expect(matchesAnyIdiom('log.Error().Str("id", id).Msg("charge failed")')).toBe(true);
    expect(matchesAnyIdiom('Log::error("charge failed");')).toBe(true);
  });

  it('matches stdout/stderr emits that have no logging facade', () => {
    expect(matchesAnyIdiom('fprintf(stderr, "fatal: %s\\n", msg);')).toBe(true);
    expect(matchesAnyIdiom('println("started")')).toBe(true);
    expect(matchesAnyIdiom('println "deploy failed"')).toBe(true);
  });
});

describe('isNonEmittingLine', () => {
  it('drops declarations, imports, guards, and comments', () => {
    expect(isNonEmittingLine('import org.slf4j.LoggerFactory;')).toBe(true);
    expect(
      isNonEmittingLine('  private static final Logger LOG = LoggerFactory.getLogger(Foo.class);')
    ).toBe(true);
    expect(isNonEmittingLine('    if (LOG.isDebugEnabled()) {')).toBe(true);
    expect(isNonEmittingLine('  // System.out.println("debugging")')).toBe(true);
    expect(isNonEmittingLine('Logger.metadata(external_id: tenant_id)')).toBe(true);
    expect(isNonEmittingLine('#[tracing::instrument(skip_all, name = "index")]')).toBe(true);
  });

  it('keeps real emissions', () => {
    expect(isNonEmittingLine('logger.error("charge failed", err)')).toBe(false);
    expect(isNonEmittingLine('level.Error(logger).Log("msg", "charge failed")')).toBe(false);
    expect(isNonEmittingLine('serverLog(LL_WARNING, "Failed to bind");')).toBe(false);
  });

  it('keeps a line that both acquires a logger and calls it', () => {
    expect(isNonEmittingLine('LoggerFactory.getLogger(Foo.class).info("started")')).toBe(false);
    // A filtered phrase inside the MESSAGE must not suppress the emission.
    expect(isNonEmittingLine('log.info("cache getLogger(x) invoked")')).toBe(false);
  });

  it('does not let a commented-out logger call escape via the emitting veto', () => {
    expect(isNonEmittingLine('  // logger.error("this call is commented out")')).toBe(true);
    expect(isNonEmittingLine('  # logger.error("this call is commented out")')).toBe(true);
  });

  it('suppresses a bare error constructor but not one passed to a real emit', () => {
    expect(isNonEmittingLine('  return fmt.Errorf("failed to charge card: %+v", err)')).toBe(true);
    expect(isNonEmittingLine('  return nil, status.Errorf(codes.Unimplemented, "nope")')).toBe(
      true
    );
    // The error value is an ARGUMENT here; the line still emits.
    expect(isNonEmittingLine('logger.Error(kverrors.New("flag requires TLS"), "")')).toBe(false);
    expect(isNonEmittingLine('panic(fmt.Errorf("error creating overrides file: %w", err))')).toBe(
      false
    );
    // Accessor-call idiom carrying an error constructor argument.
    expect(isNonEmittingLine('svc.Logger().Error(errors.New("connection refused"))')).toBe(false);
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
  it('greps every idiom pattern, scoped to <serviceRoot>/**', async () => {
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
    const regexes = esClient.esql.query.mock.calls.flatMap(([{ params }]) =>
      (params as Array<Record<string, unknown>>).filter((p) => 'regex' in p).map((p) => p.regex)
    );
    expect(regexes).toEqual([...LOGGER_IDIOM_PATTERNS]);
  });

  it('returns windowed candidates, deduped by path:line', async () => {
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
        language: undefined,
      },
    ]);
  });

  it('stops issuing greps once the aggregate candidate ceiling is reached', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggerMock.create();
    esClient.esql.query.mockImplementation((async (req: { query: string }) => {
      if (isWindowQuery(req.query)) {
        return { columns: WINDOW_COLUMNS, values: [[1, 'logger.info("hi")']] };
      }
      return {
        columns: COLUMNS,
        values: [row('src/a.ts', 1, 'logger.info("hi")'), row('src/b.ts', 2, 'logger.warn("hi")')],
      };
    }) as unknown as typeof esClient.esql.query);

    const candidates = await discoverLoggingSites({
      esClient,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src',
      logger,
      maxCandidates: 2,
    });

    // First grep alone fills the ceiling, so only that one plus the window runs.
    const grepCalls = esClient.esql.query.mock.calls.filter(([{ query }]) => !isWindowQuery(query));
    expect(grepCalls).toHaveLength(1);
    expect(candidates).toHaveLength(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('2-candidate ceiling'));
  });

  it('drops hits whose own line cannot emit', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation((async (req: { query: string }) => {
      if (isWindowQuery(req.query)) {
        return {
          columns: WINDOW_COLUMNS,
          values: [
            [10, 'import org.slf4j.LoggerFactory;'],
            [20, '    if (LOG.isDebugEnabled()) {'],
            [30, '    LOG.error("charge failed", e);'],
          ],
        };
      }
      return {
        columns: COLUMNS,
        values: [
          row('src/Main.java', 10, 'import org.slf4j.LoggerFactory;'),
          row('src/Main.java', 20, 'if (LOG.isDebugEnabled()) {'),
          row('src/Main.java', 30, 'LOG.error("charge failed", e);'),
        ],
      };
    }) as unknown as typeof esClient.esql.query);

    const candidates = await discoverLoggingSites({
      esClient,
      repository: 'open-telemetry/opentelemetry-demo',
      gitSha: 'abc123',
      serviceRoot: 'src',
      logger: loggerMock.create(),
    });

    expect(candidates.map(({ location }) => location)).toEqual(['src/Main.java:30']);
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
