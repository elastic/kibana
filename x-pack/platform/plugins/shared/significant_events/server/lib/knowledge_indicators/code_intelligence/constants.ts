/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Agent Builder agent whose presence gates Code Intelligence extraction. Today
 * this is the externally-installed **Codebox** code-research agent
 * (`codebox install.ts`), whose workflow-backed tools (git-grep, git-show,
 * git-ls-tree) pre-exist independently of this plugin.
 *
 * The extraction pipeline's server-side queries now call Codebox HTTP directly
 * (via {@link CodeboxClient}); this agent ID is used only as a presence gate —
 * "is the Codebox tool ecosystem installed?" — not as a runtime dependency.
 */
export const CODE_INTELLIGENCE_AGENT_ID = 'code-research-agent' as const;

/**
 * Code-derived Feature KIs are stored as `code_analysis` features (reusing the
 * existing computed feature type so no schema enum / UI filter changes are
 * needed) and discriminated by `subtype`.
 */
export const CODE_FEATURE_SUBTYPE_REPO_TYPE = 'repo_type' as const;
export const CODE_FEATURE_SUBTYPE_LANGUAGE = 'language' as const;
export const CODE_FEATURE_SUBTYPE_SERVICE_NAME = 'service_name' as const;
/**
 * Code-derived Feature KI subtype carrying a validated `logging_profile` — the
 * repo-specific idiom greps an agent generated for a repository + commit. Reuses
 * the `code_analysis` feature type (no schema enum / UI filter changes) and is
 * discriminated by this subtype, exactly like the other code-feature subtypes.
 */
export const CODE_FEATURE_SUBTYPE_LOGGING_PROFILE = 'logging_profile' as const;

/** `meta` keys used to carry code provenance + change-detection state. */
export const CODE_FEATURE_META_REPOSITORY = 'repository' as const;
export const CODE_FEATURE_META_CHANGE_FINGERPRINT = 'change_fingerprint' as const;
/**
 * `meta` key carrying the immutable commit a `logging_profile` was validated
 * against, so drift detection (Task 7) can compare the stored count to a fresh
 * count on the same commit without re-reading the feature body.
 */
export const CODE_FEATURE_META_LOGGING_PROFILE_COMMIT = 'logging_profile_commit' as const;
/** `meta` key carrying the generation timestamp of a `logging_profile`. */
export const CODE_FEATURE_META_LOGGING_PROFILE_GENERATED_AT =
  'logging_profile_generated_at' as const;

/**
 * Languages that mark a repository (or part of it) as Infrastructure as Code.
 * Kept intentionally narrow for the thin slice; ambiguous markup like generic
 * `yaml` is not included because it is common in application repos too.
 */
export const IAC_LANGUAGES: ReadonlySet<string> = new Set(['hcl', 'terraform', 'tf']);

/**
 * Non-programming languages that should not be considered when picking the
 * primary application language.
 */
export const NON_APP_LANGUAGES: ReadonlySet<string> = new Set([
  ...IAC_LANGUAGES,
  'markdown',
  'md',
  'json',
  'yaml',
  'yml',
  'text',
  'plaintext',
]);

/**
 * Severity level of a log call mapped to a KI query severity score (0-100).
 * Derived from the logger method name in the code (deterministic), not from log
 * frequency — predictive queries have no occurrences to score against.
 */
export const LOG_LEVEL_SEVERITY: Record<string, number> = {
  fatal: 80,
  critical: 80,
  severe: 80,
  error: 70,
  warn: 50,
  warning: 50,
  info: 30,
  debug: 20,
  trace: 20,
  fine: 20,
};

/** Default severity for a recognized log call whose level is not in the map. */
export const DEFAULT_LOG_SEVERITY = 40;

/** OTel import and instrumentation idioms, one Lucene RLIKE-safe grep each. */
export const OTEL_INSTRUMENTATION_PATTERNS = {
  instrumentation_grpc: [
    '.*otelgrpc.*',
    '.*instrumentation[-./]grpc.*',
    '.*OpenTelemetry[.]Instrumentation[.]Grpc.*',
  ],
  instrumentation_http: [
    '.*otelhttp.*',
    '.*instrumentation[-./](http|fetch|requests|urllib3|aspnetcore|sinatra).*',
    '.*OpenTelemetry[.]Instrumentation[.](Http|AspNetCore).*',
  ],
  instrumentation_other: [
    '.*@opentelemetry/.*',
    '.*go[.]opentelemetry[.]io/.*',
    '.*opentelemetry-instrumentation-.*',
    '.*opentelemetry[._](api|sdk).*',
    '.*from.*@opentelemetry/.*',
    '.*OpenTelemetry[.].*',
  ],
  start_span: ['.*(startSpan|start_as_current_span|startActiveSpan|spanBuilder|StartActivity).*'],
  set_attribute: ['.*(setAttribute|setAttributes|set_attribute|SetTag).*'],
  add_event: ['.*(addEvent|add_event|AddEvent).*'],
  record_exception: ['.*(recordException|record_exception|RecordError|record_error).*'],
  set_status_error: ['.*(setStatus|set_status|SetStatus).*(ERROR|Error|kError|codes[.]Error).*'],
  create_metric: [
    '.*(createCounter|createHistogram|create_counter|create_histogram|Int64Counter|counterBuilder|histogramBuilder).*',
  ],
} as const;

/**
 * Repository-relative path fragments that mark a file as TEST or BUILD/CI
 * tooling rather than production service code. Logging-site grep excludes any
 * candidate whose path matches one of these, so test fixtures and build/CI
 * scripts (whose `echo "Error: ..."`/`log(...)` lines are developer output, not
 * running-service logs) never reach the classifier. Excluding at grep time also
 * saves the classify calls those candidates would have cost.
 *
 * Deterministic and path-based (the classifier prompt is a softer, fuzzier
 * backstop). Matched case-insensitively as substrings against the full
 * repository-relative path, with directory fragments wrapped in `/` so they
 * match a path segment (e.g. `/test/`), and suffix fragments matched at the end.
 */
export const EXCLUDED_PATH_DIR_FRAGMENTS: readonly string[] = [
  '/test/',
  '/tests/',
  '/__tests__/',
  '/__mocks__/',
  '/e2e/',
  '/cypress/',
  '/fixtures/',
  '/benchmarks/',
  // JVM/Gradle test source sets (elasticsearch): src/test, src/internalClusterTest,
  // src/integTest, src/javaRestTest, src/yamlRestTest, src/test-fixtures, etc.
  '/internalclustertest/',
  '/integtest/',
  '/javaresttest/',
  '/yamlresttest/',
  '/test-fixtures/',
  '/.buildkite/',
  '/.github/',
  '/.ci/',
  '/gradle/',
  '/node_modules/',
] as const;

/** Path substrings (anywhere) that mark test or build/CI tooling files. */
export const EXCLUDED_PATH_SUBSTRINGS: readonly string[] = [
  '.test.',
  '.spec.',
  '_test.',
  '.buildkite',
  '.github/workflows',
] as const;

/**
 * Path suffixes (basename endings) that mark build tooling or shell-script
 * files. Shell scripts are excluded wholesale: their `echo`/`printf` output goes
 * to a terminal, not a service log pipeline, so treating them as logging sites
 * is almost always a false positive (CI, bootstrap, util, and onboarding
 * scripts alike). The rare shipped operational script is not worth the noise.
 */
export const EXCLUDED_PATH_SUFFIXES: readonly string[] = [
  '/makefile',
  '.mk',
  '/dockerfile',
  '.gradle',
  '.gradle.kts',
  '.sh',
  '.bash',
  '.zsh',
  '.ps1',
  '_test.go',
  // Prose, not source. Documentation quotes logger calls in fenced code blocks
  // (`discovery/README.md` in prometheus, `forum/README.md` in supabase/realtime
  // both produced logging candidates), and those examples are never executed, so
  // their strings can never appear in a log.
  '.md',
  '.mdx',
  '.rst',
  '.adoc',
  '.txt',
] as const;

/**
 * Case-SENSITIVE JVM test-class basename convention: `FooTest`, `FooTests`,
 * `FooIT`, `FooIntegTests`, `FooBenchmarkTests`, etc. in Java/Kotlin/Scala/
 * Groovy. Matched on the capitalised camelCase boundary so `Latest.java` /
 * `Unit.java` are NOT excluded. These test classes frequently live outside a
 * `/test/` directory (e.g. elasticsearch `src/internalClusterTest`).
 */
export const JVM_TEST_CLASS_PATTERN = /(?:Test|Tests|IT|IntegTests)\.(?:java|kt|scala|groovy)$/;

/**
 * Whether a repository-relative file path is a TEST or BUILD/CI tooling file
 * that should be excluded from logging-site discovery. Case-insensitive.
 */
export const isExcludedLoggingPath = (filePath: string): boolean => {
  // Case-sensitive check first: JVM test classes rely on the camelCase boundary
  // (`FooTests.java`) so `Latest.java` is not mistaken for a test.
  if (JVM_TEST_CLASS_PATTERN.test(filePath)) {
    return true;
  }
  const path = filePath.toLowerCase();
  // Prepend `/` so a repo-root basename (e.g. `Makefile`, `Dockerfile`) matches
  // a `/`-anchored directory fragment or suffix the same as a nested one.
  const anchored = `/${path}`;
  return (
    EXCLUDED_PATH_DIR_FRAGMENTS.some((fragment) => `${anchored}/`.includes(fragment)) ||
    EXCLUDED_PATH_SUBSTRINGS.some((fragment) => path.includes(fragment)) ||
    EXCLUDED_PATH_SUFFIXES.some((suffix) => anchored.endsWith(suffix))
  );
};

/**
 * Lucene RLIKE patterns matching production logger idioms, one idiom per pattern
 * (per the grep tool's own guidance — several small greps beat one mega-
 * alternation and avoid automaton determinization blowup). Verified against the
 * OpenTelemetry demo. Lucene RLIKE gotchas baked in:
 * - anchored to the whole value, so every pattern is wrapped in `.*`;
 * - case-sensitive, so case is enumerated in the alternations;
 * - a literal dot is written `[.]` (a bare `\.` is rejected by the ES|QL string
 *   literal parser).
 *
 * Recall boundary (Tier-1): convention-named loggers, chained builder calls,
 * standard stream calls, and process-aborting emits that write their message to
 * stderr (`panic`, `.expect`). Misses PROJECT-LOCAL WRAPPERS — a repo's own
 * `log_error(...)` / `serverLog(...)` helper that calls a real logger inside.
 * The wrapper name is per-repo, so no fixed pattern can cover it; that tail needs
 * a second discovery pass, not another regex here.
 *
 * Measured recall against a 14-repo / 18.3M-line corpus is recorded in the vault
 * (`logger-idiom-recall-survey-results`); re-score there before adding a pattern.
 *
 * Deliberately NOT covered: value-returning error constructors such as Go
 * `fmt.Errorf("...")`. They are not log emissions — the returned error is
 * recomposed by whatever logs it upstream, so the source literal does not appear
 * verbatim in the logs (measured on the OTel Demo corpus: predicted phrases
 * traced to `fmt.Errorf`/`throw`/span `addEvent` did not match ingested logs).
 */
export const LOGGER_IDIOM_PATTERNS: readonly string[] = [
  // logger.info(...) / Logger.Error(...) / logging.warning(...) — go/java/py method calls.
  '.*[lL]og(ger|ging)?[.]([iI]nfo|[eE]rror|[wW]arn|[wW]arning|[dD]ebug|[tT]race|[pP]rint|[fF]atal|[pP]rintln|[pP]rintf|[eE]xception|[cC]ritical).*',
  // this.logger.x(...) / self.logger.x(...) — member-field loggers.
  '.*(this|self)[.][lL]og(ger)?[.](info|warn|warning|error|debug|trace|fatal).*',
  // console.log/error/warn(...) — JS/TS.
  '.*console[.](log|error|warn|info|debug|trace).*',
  // info!(...) / error!(...) — Rust level macros.
  '.*(info|warn|error|debug|trace)![(].*',
  // $logger->info(...) — PHP arrow calls.
  '.*logger->(info|error|warning|debug|critical|notice).*',
  // Logger.info(...) — Elixir/py module-level Logger.
  '.*Logger[.](info|warn|warning|error|debug|critical|notice).*',
  // LoggerFactory.getLogger(...) — java slf4j declaration site.
  '.*LoggerFactory.*',
  // slog.Info(...) — go structured logging.
  '.*slog[.](Info|Warn|Error|Debug).*',
  // logrus.Info(...) — go logrus.
  '.*logrus[.](Info|Warn|Error|Debug|Fatal).*',
  // LOG.error(...) / LOGGER.info(...) — uppercase Java constant loggers.
  '.*(LOG|LOGGER)[.](info|warn|warning|error|debug|trace|fatal).*',
  // _logger.LogError(...) / logger.LogInformation(...) — Microsoft.Extensions.Logging.
  '.*[lL]og(ger)?[.]Log(Trace|Debug|Information|Warning|Error|Critical).*',
  // System.out.println(...) / System.err.print(...) — Java standard streams.
  '.*System[.](out|err)[.]print(ln)?.*',
  // panic("...") — Go abort; the message is written to stderr.
  '.*panic[(].*',
  // panic!("...") — Rust abort macro.
  '.*panic![(].*',
  // eprintln!(...) — Rust stderr print.
  '.*eprintln![(].*',
  // .expect("...") — Rust unwrap-with-message; aborts and prints the message.
  '.*[.]expect[(].*',
  // logger.WithField(...).Error(...) / logger.bind(...).error(...) /
  // logger.atError()...log(...) — the CHAINED BUILDER family: the level call is
  // separated from the logger by a builder chain, so the adjacent-token patterns
  // above cannot see it. Covers logrus, structlog, loguru, slf4j 2.x fluent, and
  // `this.logger.get("scope").debug(...)`.
  // The `(.*[^A-Za-z])?` prefix forces `log` to start an identifier (Lucene RLIKE
  // has no `\b`), so `catalogService.metrics.Error(...)` cannot match; the
  // interior is bounded to one statement so the chain cannot span a `;`.
  '(.*[^A-Za-z])?[lL]og[A-Za-z_]*[.][^;]*[.]([iI]nfo|[eE]rror|[wW]arn|[wW]arning|[dD]ebug|[fF]atal|[cC]ritical)[(].*',
  // svc.Logger().Error(...) — accessor-call form; `()` breaks token adjacency.
  '(.*[^A-Za-z])?[lL]og(ger)?[(][)][.]([iI]nfo|[eE]rror|[wW]arn|[wW]arning|[dD]ebug|[fF]atal).*',
  // level.Error(logger).Log("msg", ...) — go-kit inverts the receiver: the LEVEL
  // wraps the logger. Dominant idiom in the Grafana/Cortex Go ecosystem.
  '.*level[.](Error|Warn|Info|Debug)[(].*',
  // log.Error().Str(...).Msg("...") — zerolog terminates the chain with .Msg.
  '.*[.](Error|Warn|Info|Debug|Fatal)[(][)].*[.]Msg.*',
  // Log::error("...") — Laravel facade (PSR-3 arrow form is covered above).
  '.*Log::(error|warning|info|debug|critical|alert|emergency|notice).*',
  // fprintf(stderr, "...") — C/C++ diagnostic output; no logging facade exists.
  '.*fprintf[(]stderr.*',
  // println("...") / println "..." — Groovy/Scala/Kotlin stdout (Java's
  // System.out.println is covered above).
  '.*println[ (].*',
  // Logger.log(level, msg) / logger.log(level, ...) / $logger->log($level, ...) —
  // DYNAMIC LEVEL: the severity is a runtime argument, not part of the method
  // name, so none of the level-enumerating patterns above can see it. This is the
  // shape a logging call collapses to once a helper takes `level` as a parameter.
  // Measured: it is the ONLY real emission in `supabase/realtime`'s logging
  // module (`.../realtime_channel/logging.ex:71`) and the single production hit in
  // `laravel/framework` (`.../Exceptions/Handler.php:476`).
  '(.*[^A-Za-z])?[lL]og(ger|ging)?[.]log[(].*',
  '(.*[^A-Za-z])?[lL]og(ger)?->log[(].*',
] as const;

/**
 * JS regex sources (NOT Lucene — these run in-process on the grep hit line, not
 * in ES) matching lines that a logger idiom legitimately matches but that emit
 * NOTHING at runtime. Applied to the hit line only, never the surrounding
 * window, so a guard or declaration next to a real emission cannot suppress it.
 *
 * Every rule is a language construct, not a heuristic about wording:
 * a value-returning error constructor hands its text to a caller; an import,
 * annotation, declaration, or level guard names a logger without calling it.
 *
 * This is a COST filter as much as a correctness one — each suppressed line is a
 * classifier payload not sent. Measured on a 14-repo corpus, logger declarations
 * and `isDebugEnabled()` guards were the dominant false positive in JVM repos.
 */
export const NON_EMITTING_LINE_PATTERNS: readonly string[] = [
  // Import / use / include lines.
  '^[ \t]*(import|use|require|from|#include)[ (]',
  // Comment-only lines. Unconditional: a commented-out logger call is still a
  // comment, so the emitting-call veto below must NOT rescue it.
  '^[ \t]*(//|#|\\*|/\\*|--)',
] as const;

/**
 * Constructs that name or configure a logger, or build an error value, without
 * emitting. Each is suppressed ONLY when the line performs no emission of its
 * own — the same line may both acquire a logger and call it
 * (`LoggerFactory.getLogger(Foo.class).info("started")`), or pass an error value
 * INTO a real emit (`logger.Error(kverrors.New("..."))`,
 * `panic(fmt.Errorf("..."))`). See {@link EMITTING_CALL_PATTERN}.
 */
export const NON_EMITTING_UNLESS_CALLED_PATTERNS: readonly string[] = [
  // Level guards: `if (LOG.isDebugEnabled())`, `Core().Enabled(...)`.
  'is(Debug|Info|Warn|Trace|Error)Enabled|IsEnabled[(]|LevelEnabled|isHandling[(]',
  // Annotations / attributes that declare logging rather than perform it.
  '#\\[tracing::instrument|@Slf4j|@Log[( ]|\\[LoggerMessage',
  // Span constructs — tracing, not logging.
  '(info|debug|error|warn)_span!|[.]instrument[(]|tracing::Span',
  // Logger construction / acquisition.
  'LoggerFactory[.]getLogger[(]|[ .]getLogger[(]|NewNopLogger|new Logger[(]|Logger[.]new|slog[.]New|zap[.]New|promslog[.]New',
  // Logger metadata / level configuration.
  'Logger[.]metadata[(]|[.]setLevel[(]|Logger[.]configure|put_process_level',
  // Value-returning error constructors: the text is recomposed by whoever logs
  // the returned error, so this literal never reaches a log verbatim.
  'fmt[.]Errorf[(]|errors[.]New[(]|status[.]Errorf[(]|httpgrpc[.]Errorf[(]|xerrors[.]',
] as const;

/**
 * Proof the line itself emits, used to veto every
 * {@link NON_EMITTING_UNLESS_CALLED_PATTERNS} rule.
 *
 * A dot-prefixed severity call WITH an open paren is the discriminator: it
 * matches `.info(` / `.Error(` / `.Msg(` on any receiver (including the accessor
 * and chained-builder idioms) while missing `.isDebugEnabled(`, `.getLogger(`,
 * and `.metadata(`, whose severity token is not a call of its own.
 */
export const EMITTING_CALL_PATTERN =
  '[.](info|Info|error|Error|warn|Warn|warning|Warning|debug|Debug|fatal|Fatal|critical|Critical|log|Log|Msg|Msgf|print|Print|println|Println)[(]|panic[!(]|[ (]println[ (]|fprintf[(]stderr|eprintln';

const NON_EMITTING_LINE_REGEXPS = NON_EMITTING_LINE_PATTERNS.map((source) => new RegExp(source));
const NON_EMITTING_UNLESS_CALLED_REGEXPS = NON_EMITTING_UNLESS_CALLED_PATTERNS.map(
  (source) => new RegExp(source)
);
const EMITTING_CALL_REGEXP = new RegExp(EMITTING_CALL_PATTERN);

/**
 * True when `line` matches a logger idiom but cannot put a message into a log
 * record at runtime. See {@link NON_EMITTING_LINE_PATTERNS} and
 * {@link NON_EMITTING_UNLESS_CALLED_PATTERNS}.
 */
export const isNonEmittingLine = (line: string): boolean => {
  if (NON_EMITTING_LINE_REGEXPS.some((regexp) => regexp.test(line))) {
    return true;
  }
  if (EMITTING_CALL_REGEXP.test(line)) {
    return false;
  }
  return NON_EMITTING_UNLESS_CALLED_REGEXPS.some((regexp) => regexp.test(line));
};

/**
 * Over-capture ceiling for a validated logging-profile grep: a grep whose
 * validated hit ratio (hits / repo_total_lines) meets or exceeds this fraction
 * is rejected at persistence (INV-006) and by the `validate_logging_queries`
 * tool. `.*log.*` measured at 1.6% of a 108K-line repo is the canonical bad
 * grep; a real wrapper grep lands well under 1%. Shared here so the tool
 * (`agent_builder/tools/validate_logging_queries`) and the persistence layer
 * (`logging_profile.ts`) reference one definition without a cross-layer import.
 */
export const OVER_CAPTURE_CEILING = 0.01;

/**
 * Safety cap for `git grep --max-count`. Any single grep returning more than
 * this many lines is almost certainly a degenerate pattern (match-all, overly
 * broad wildcard). The cap prevents the .http connector from timing out on
 * massive responses and keeps memory bounded.
 */
export const MAX_GREP_HITS = 50_000;

/**
 * Drift ratio for {@link detectLoggingProfileDrift}: a stored grep's recount is
 * flagged for refresh when it drops to zero OR falls by more than this fraction
 * of its stored `expect_call_sites` (e.g. `0.5` = a >50% drop). A failed count
 * query is NEVER treated as a drop (INV-002) — the profile is kept and the
 * failure recorded. Shared here so the drift detector and the task-4 gate
 * reference one definition.
 */
export const LOGGING_PROFILE_DRIFT_RATIO = 0.5;

/**
 * Fallback log target for predictive code queries when NO real log-bearing
 * stream exists yet (a cluster indexed its source before it started shipping
 * logs — the chicken-vs-egg case). Predictive queries are written against the
 * broad `logs*` index pattern and matched on the conventional `message` field,
 * attached to the root wired-logs stream `logs`. They lie dormant until log
 * data begins flowing, then start matching automatically — no re-run needed.
 */
export const FALLBACK_LOG_INDEX_PATTERN = 'logs-*' as const;
export const FALLBACK_TRACE_INDEX_PATTERN = 'traces-*' as const;
export const FALLBACK_METRIC_INDEX_PATTERN = 'metrics-*' as const;
export const FALLBACK_LOG_STREAM = 'logs' as const;
export const FALLBACK_LOG_MESSAGE_FIELD = 'message' as const;

/**
 * Build/deploy marker basenames that flag a directory as a candidate deployable
 * service, mapped to the primary language they imply. Language falls out of the
 * marker deterministically (no LLM, no drift). A directory containing any of
 * these is a candidate root; the classifier ({@link classifyServices}) then
 * judges which candidates are real services and collapses env/region duplicates.
 *
 * Tier-1 boundary (same philosophy as the logger idioms): convention-named
 * markers only. A service with a bespoke build (bare `Makefile`, custom deploy)
 * is missed; the set is intentionally extensible.
 */
export interface ServiceDeployMarker {
  marker: string;
  language: string;
  patternOverride?: string;
  basenameMatches?: (basename: string) => boolean;
}

export const SERVICE_DEPLOY_MARKERS: readonly ServiceDeployMarker[] = [
  { marker: 'go.mod', language: 'Go' },
  { marker: 'Cargo.toml', language: 'Rust' },
  { marker: 'pom.xml', language: 'Java' },
  { marker: 'build.gradle', language: 'Java' },
  { marker: 'build.gradle.kts', language: 'Java' },
  { marker: '.csproj', language: 'C#' },
  { marker: 'pyproject.toml', language: 'Python' },
  { marker: 'requirements.txt', language: 'Python' },
  { marker: 'Gemfile', language: 'Ruby' },
  { marker: 'composer.json', language: 'PHP' },
  { marker: 'package.json', language: 'JavaScript/TypeScript' },
  { marker: 'CMakeLists.txt', language: 'C++' },
  { marker: 'mix.exs', language: 'Elixir' },
  // Dockerfile is the near-universal deploy marker but implies no language on its
  // own; language is resolved from a co-located build marker when present.
  {
    marker: 'Dockerfile',
    language: '',
    patternOverride: '.*Dockerfile([.][A-Za-z0-9_-]+)?',
    basenameMatches: (basename) => /^Dockerfile(?:\.[A-Za-z0-9_-]+)?$/.test(basename),
  },
] as const;

/**
 * Lucene RLIKE patterns (matched against `file.path`) that flag a file as a
 * deployment MANIFEST — declaring runtime services, including third-party images
 * with no build marker (kafka, datastores, collectors). Feeding the classifier
 * the manifest *paths* (not contents) keeps discovery cheap; the manifest is the
 * repo's own authoritative service list. Format-agnostic on purpose (compose,
 * k8s, helm, ECS, serverless, nomad).
 */
export const MANIFEST_PATH_PATTERNS: readonly string[] = [
  '.*docker-compose.*[.]ya?ml',
  '.*compose([.][a-z]+)?[.]ya?ml',
  '.*/k8s/.*[.]ya?ml',
  '.*/kubernetes/.*[.]ya?ml',
  '.*[Cc]hart[.]ya?ml',
  '.*values[.]ya?ml',
  '.*deployment[.]ya?ml',
  '.*kustomization[.]ya?ml',
  '.*task-def.*[.]json',
  '.*serverless[.](yml|yaml|ts|js)',
  '.*[.]nomad',
] as const;

/**
 * Recognized IaC marker basenames mapped to the {@link IacKind} the schema uses.
 * Used to attach `iacSignals` to the discovered repository without an LLM.
 */
export const IAC_PATH_MARKERS: ReadonlyArray<{ pattern: string; kind: string }> = [
  { pattern: '.*[.]tf', kind: 'terraform' },
  { pattern: '.*[Cc]hart[.]ya?ml', kind: 'helm' },
  { pattern: '.*docker-compose.*[.]ya?ml', kind: 'compose' },
  { pattern: '.*compose([.][a-z]+)?[.]ya?ml', kind: 'compose' },
  { pattern: '.*kustomization[.]ya?ml', kind: 'kubernetes' },
  { pattern: '.*/k8s/.*[.]ya?ml', kind: 'kubernetes' },
] as const;
