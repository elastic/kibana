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
 * Recall boundary (Tier-1): convention-named loggers only. Misses custom-named
 * wrapper instances (`audit = createLogger(); audit.write(...)`) and
 * non-severity SDK emit methods. Closing that tail (per-language tree-sitter, as
 * in elastic/semantic-code-search#168) is a later refinement.
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

/**
 * Builds the string-literal-anchored RLIKE patterns for one phrase body: one for
 * double-quoted literals (double-quote escaped as `\\"`), one for single-quoted.
 */
export const anchoredPhrasePatterns = (phrase: string): string[] => [
  `.*\\"[^\\"]*${phrase}[^\\"]*\\".*`,
  `.*'[^']*${phrase}[^']*'.*`,
];
