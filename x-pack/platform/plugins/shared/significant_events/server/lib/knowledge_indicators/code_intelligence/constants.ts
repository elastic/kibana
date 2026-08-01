/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Agent Builder agent that drives Code Intelligence KI extraction. The workflow
 * reads source through this agent's read-only tools (repo discovery, file reads,
 * regex grep). Today this is the externally-installed **Sourcerer** agent
 * (`sourcerer setup`), whose tools/skills pre-exist independently of this plugin.
 *
 * This is the one swap point for the substrate: when the Agent Builder code
 * sandbox arrives, point this at the sandbox agent id (and retarget the workflow
 * message to its tools). The `code_extraction.yaml` `agent-id` literal must be
 * kept in sync with this value (YAML cannot import a TS constant).
 */
export const CODE_INTELLIGENCE_AGENT_ID = 'sourcerer' as const;

/**
 * Code-derived Feature KIs are stored as `code_analysis` features (reusing the
 * existing computed feature type so no schema enum / UI filter changes are
 * needed) and discriminated by `subtype`.
 */
export const CODE_FEATURE_SUBTYPE_REPO_TYPE = 'repo_type' as const;
export const CODE_FEATURE_SUBTYPE_LANGUAGE = 'language' as const;
export const CODE_FEATURE_SUBTYPE_SERVICE_NAME = 'service_name' as const;

/** `meta` keys used to carry code provenance + change-detection state. */
export const CODE_FEATURE_META_REPOSITORY = 'repository' as const;
export const CODE_FEATURE_META_CHANGE_FINGERPRINT = 'change_fingerprint' as const;

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

/**
 * Elasticsearch index pattern written by Sourcerer's line indexer — one
 * document per source line (`git.org`, `git.repo`, `git.commit`, `file.path`,
 * `line.number`, `line.content`). The deterministic logging-site discovery greps
 * over this pattern with the same ES|QL contract as the `sourcerer.code.grep`
 * tool. This is the substrate seam: when the Agent Builder code sandbox arrives
 * with ripgrep, only the grep driver changes, not the pattern set.
 */
export const SOURCERER_LINES_INDEX = 'sourcerer-v1-lines*' as const;

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
 * Recall boundary (Tier-1): convention-named loggers and standard stream calls
 * only. Misses custom-named wrapper instances (`audit = createLogger();
 * audit.write(...)`) and non-severity SDK emit methods. Closing that tail
 * (per-language tree-sitter, as in elastic/semantic-code-search#168) is a later
 * refinement.
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
] as const;

/**
 * Log-message phrase lexicon (Stage 3 recall lift). Matched ONLY inside a string
 * literal, so it catches production log/diagnostic messages emitted through
 * idioms the Tier-1 set misses — Go `fmt.Errorf("...")`, `eprintln!`, `.expect`,
 * `Console.WriteLine`, PHP `echo`, structured event tables — language-agnostic.
 *
 * Precision is intentionally traded for recall here: a downstream classifier
 * (see `classify_logging_sites.ts`) decides keep/drop + level, so this layer only
 * needs to surface candidates. Bare (unanchored) phrase matching is ~7%
 * precision; string-literal anchoring is the load-bearing constraint.
 *
 * Lucene RLIKE gotcha: `"` is a special (literal-quoting) char in Lucene regexp,
 * so a literal double-quote must be escaped as `\\"` and `[^\\"]` used for
 * "not a double-quote"; single quotes are ordinary. See `anchoredPhrasePatterns`.
 */
export const LOGGER_PHRASE_LEXICON: readonly string[] = [
  '[sS]tarting',
  '[sS]tarted',
  '[sS]hutting [dD]own',
  '[sS]hutdown',
  '[lL]istening on',
  '[cC]onnecting to',
  '[cC]onnected to',
  '[cC]onnection refused',
  '[cC]onnection reset',
  '[tT]imed out',
  '[tT]imeout',
  '[rR]etry',
  '[rR]etrying',
  '[fF]ailed to',
  '[uU]nable to',
  '[cC]ould not',
  '[iI]nitializ',
  '[iI]nitialis',
  '[hH]ealth check',
  '[dD]eprecat',
  '[rR]eceived',
  '[pP]rocessing',
  '[pP]rocessed',
  '[sS]ending',
  '[eE]rror',
  '[wW]arning',
  '[eE]xception',
] as const;

/** Builds string-literal-anchored RLIKE patterns for one phrase body. */
export const anchoredPhrasePatterns = (phrase: string): string[] => [
  `.*\\"[^\\"]*${phrase}[^\\"]*\\".*`,
  `.*'[^']*${phrase}[^']*'.*`,
  `.*\`[^\`]*${phrase}[^\`]*\`.*`,
];

/**
 * Shape-based recall for human-readable sentence literals not covered by the
 * phrase lexicon. One pattern per quote style; content must start with a letter
 * and contain at least 3 space-separated words.
 */
export const SENTENCE_LITERAL_PATTERNS: readonly string[] = [
  '.*\\"[A-Za-z][^\\" ]* [^\\" ]+ [^\\"]+\\".*',
  ".*'[A-Za-z][^' ]* [^' ]+ [^']+'.*",
  '.*`[A-Za-z][^` ]* [^` ]+ [^`]+`.*',
] as const;

/**
 * Elasticsearch index written by Sourcerer's ref indexer — one document per
 * indexed git ref (`git.org`, `git.repo`, `git.commit`, `git.ref`,
 * `files_count`, `lines_count`, `status`). Stage-4 service discovery enumerates
 * the indexed repositories + their immutable commits from here (server-side
 * equivalent of the agent's `sourcerer.refs.list`).
 */
export const SOURCERER_REFS_INDEX = 'sourcerer-v1-refs*' as const;

export const SOURCERER_FILES_INDEX = 'sourcerer-v1-files*' as const;

/**
 * File-extension (lowercase, no dot) -> programming/markup language, used to
 * build a repository language histogram from the Sourcerer files index so
 * {@link classifyRepository} can tell an application repo from Infrastructure as
 * Code. Only extensions that clearly denote a language are mapped; unknown
 * extensions are ignored (they do not vote). Terraform/HCL map to IaC languages
 * (see IAC_LANGUAGES) so an IaC repo is still recognised as such.
 */
export const EXTENSION_LANGUAGE: Readonly<Record<string, string>> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  mts: 'TypeScript',
  cts: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  java: 'Java',
  kt: 'Kotlin',
  kts: 'Kotlin',
  scala: 'Scala',
  groovy: 'Groovy',
  go: 'Go',
  rs: 'Rust',
  py: 'Python',
  rb: 'Ruby',
  php: 'PHP',
  cs: 'C#',
  cpp: 'C++',
  cc: 'C++',
  cxx: 'C++',
  c: 'C',
  h: 'C',
  hpp: 'C++',
  swift: 'Swift',
  ex: 'Elixir',
  exs: 'Elixir',
  erl: 'Erlang',
  clj: 'Clojure',
  hcl: 'hcl',
  tf: 'hcl',
  tfvars: 'hcl',
} as const;

/**
 * Fallback log target for predictive code queries when NO real log-bearing
 * stream exists yet (a cluster indexed its source before it started shipping
 * logs — the chicken-vs-egg case). Predictive queries are written against the
 * broad `logs*` index pattern and matched on the conventional `message` field,
 * attached to the root wired-logs stream `logs`. They lie dormant until log
 * data begins flowing, then start matching automatically — no re-run needed.
 */
export const FALLBACK_LOG_INDEX_PATTERN = 'logs*' as const;
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
