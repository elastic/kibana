/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  isExcludedLoggingPath,
  isNonEmittingLine,
  LOGGER_IDIOM_PATTERNS,
  SOURCERER_LINES_INDEX,
} from './constants';
import { discoverLoggingWrappers, escapeLuceneLiteral } from './discover_logging_wrappers';
import type { LoggingCandidate } from './types';

/** One matched source line returned by {@link codeGrep}. */
export interface GrepLine {
  filePath: string;
  lineNumber: number;
  content: string;
}

export interface CodeGrepOptions {
  esClient: ElasticsearchClient;
  /** Git org (matched with MATCH); `*` for any. */
  gitOrg: string;
  /** Git repo (LIKE wildcard); `*` for any. */
  gitRepo: string;
  /** Immutable commit (LIKE wildcard); `*` for any. */
  gitCommit: string;
  /** File-path glob, `*` single-segment and `**` recursive (e.g. `src/foo/**`). */
  filePath: string;
  /** Lucene RLIKE regex; anchored to the whole value, so wrap in `.*`. */
  regex: string;
  /** Max lines to return. */
  limit: number;
}

/**
 * Greps the Sourcerer line indices (`sourcerer-v1-lines*` and `sourcerer-v2-lines*`) with a single Lucene
 * RLIKE regex, scoped to an org/repo/commit and a glob file path. This is a
 * server-side port of the `sourcerer.code.grep` Agent Builder tool: the ES|QL
 * (including the recursive-glob depth logic that confines a `*` to one path
 * segment) is intentionally identical, so results match the tool the agent used
 * to call. The substrate seam lives here — a future sandbox ripgrep driver would
 * replace only this function.
 *
 * Never throws: a query failure (bad regex, missing index) yields an empty
 * result so one bad idiom can't abort discovery for a whole service.
 */
export async function codeGrep({
  esClient,
  gitOrg,
  gitRepo,
  gitCommit,
  filePath,
  regex,
  limit,
}: CodeGrepOptions): Promise<GrepLine[]> {
  // Depth-aware glob (see sourcerer.code.grep): a non-recursive pattern requires
  // the indexed path to have exactly as many segments as the pattern, which is
  // what keeps a bare `*` from crossing a `/`.
  const query = `
    FROM ${SOURCERER_LINES_INDEX}
    | WHERE MATCH(git.org, ?git_org)
        AND git.repo LIKE ?git_repo
        AND git.commit LIKE ?git_commit
        AND file.path LIKE ?file_path
        AND line.content RLIKE ?regex
    | EVAL fp_is_recursive = ?file_path != REPLACE(?file_path, "[*][*]", "")
    | EVAL fp_num_input_segments = LENGTH(?file_path) - LENGTH(REPLACE(?file_path, "/", "")) + 1
    | EVAL fp_num_segments = MV_COUNT(SPLIT(file.path, "/"))
    | WHERE fp_is_recursive OR fp_num_segments == fp_num_input_segments
    | KEEP git.org, git.repo, git.commit, file.path, line.number, line.content
    | SORT git.org, git.repo, git.commit, file.path, line.number
    | LIMIT ${limit}`;

  const response = (await esClient.esql.query({
    query,
    params: [
      { git_org: gitOrg },
      { git_repo: gitRepo },
      { git_commit: gitCommit },
      { file_path: filePath },
      { regex },
    ],
    drop_null_columns: false,
  })) as ESQLSearchResponse;

  const pathCol = response.columns.findIndex((c) => c.name === 'file.path');
  const lineCol = response.columns.findIndex((c) => c.name === 'line.number');
  const contentCol = response.columns.findIndex((c) => c.name === 'line.content');
  if (pathCol === -1 || lineCol === -1 || contentCol === -1) {
    return [];
  }

  return response.values.map((row) => ({
    filePath: String(row[pathCol] ?? ''),
    lineNumber: Number(row[lineCol] ?? 0),
    content: String(row[contentCol] ?? ''),
  }));
}

/** Splits an agent-reported `"org/repo"` repository string into its parts. */
export function splitRepository(repository: string): { org: string; repo: string } {
  const slash = repository.indexOf('/');
  if (slash === -1) {
    return { org: '*', repo: repository };
  }
  return { org: repository.slice(0, slash), repo: repository.slice(slash + 1) };
}

/**
 * Fetches, per file, the content of every line number in `[min-1, max+1]` so a
 * matched line can be presented with its +/-1 neighbours. Batched one query per
 * file over the requested numeric span; never throws (a failed file is skipped).
 */
export async function fetchLineWindows({
  esClient,
  gitOrg,
  gitRepo,
  gitCommit,
  hitsByFile,
  logger,
}: {
  esClient: ElasticsearchClient;
  gitOrg: string;
  gitRepo: string;
  gitCommit: string;
  /** file path -> set of matched line numbers. */
  hitsByFile: Map<string, Set<number>>;
  logger: Logger;
}): Promise<Map<string, Map<number, string>>> {
  const out = new Map<string, Map<number, string>>();

  for (const [path, lineNumbers] of hitsByFile) {
    const wanted = new Set<number>();
    for (const n of lineNumbers) {
      wanted.add(n - 1);
      wanted.add(n);
      wanted.add(n + 1);
    }
    const lo = Math.min(...wanted);
    const hi = Math.max(...wanted);

    try {
      const response = (await esClient.esql.query({
        query: `
          FROM ${SOURCERER_LINES_INDEX}
          | WHERE MATCH(git.org, ?git_org)
              AND git.repo LIKE ?git_repo
              AND git.commit LIKE ?git_commit
              AND file.path == ?file_path
              AND line.number >= ?lo AND line.number <= ?hi
          | KEEP line.number, line.content
          | SORT line.number
          | LIMIT 10000`,
        params: [
          { git_org: gitOrg },
          { git_repo: gitRepo },
          { git_commit: gitCommit },
          { file_path: path },
          { lo },
          { hi },
        ],
        drop_null_columns: false,
      })) as ESQLSearchResponse;

      const lineCol = response.columns.findIndex((c) => c.name === 'line.number');
      const contentCol = response.columns.findIndex((c) => c.name === 'line.content');
      if (lineCol === -1 || contentCol === -1) {
        continue;
      }
      const fileLines = new Map<number, string>();
      for (const row of response.values) {
        fileLines.set(Number(row[lineCol] ?? 0), String(row[contentCol] ?? ''));
      }
      out.set(path, fileLines);
    } catch (error) {
      logger.debug(
        `logging_sites: window fetch failed for "${path}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return out;
}

export interface DiscoverLoggingSitesOptions {
  esClient: ElasticsearchClient;
  /** Repository as `"org/repo"`. */
  repository: string;
  /** Immutable commit SHA to scope every grep to. */
  gitSha: string;
  /** Repository-relative service root; grep is confined to `<root>/**`. */
  serviceRoot: string;
  /** Primary language, carried onto each candidate for downstream context. */
  language?: string;
  logger: Logger;
  /** Max lines per grep pattern (defaults to 500). */
  perPatternLimit?: number;
  /**
   * Ceiling on distinct candidate locations across ALL patterns (defaults to
   * 3000). `perPatternLimit` bounds one grep; this bounds the union, which is
   * what the window fetch and the LLM classifier actually pay for.
   */
  maxCandidates?: number;
  /**
   * Whether to run the second-pass {@link discoverLoggingWrappers} discovery
   * and grep its returned wrapper names for call sites (defaults to `true`).
   * Set `false` to disable the pass without editing constants.
   */
  discoverWrappers?: boolean;
}

/**
 * Deterministically discovers candidate logging call sites for one service by
 * grepping the indexed source with the logger idiom patterns, then a second
 * pass ({@link discoverLoggingWrappers}) that finds the service's OWN logging-
 * wrapper function names (a house `log_error(...)` / `serverLog(...)` helper
 * that calls a real logger internally) and greps their call sites too. Idiom
 * hits are the seed for the wrapper pass; wrapper call sites only ADD to the
 * candidate set, never replace or filter idiom hits. Each candidate carries a
 * +/-1 line window, so multi-line logger calls keep their `logger.x(` context.
 * Deduplicated by `path:line`. The classifier ({@link classifyLoggingSites})
 * then decides keep/drop + level, and kept candidates become
 * {@link LoggingChunk}s.
 *
 * Idioms are the whole FIRST-pass recall surface on purpose: a string-literal
 * phrase lexicon was measured to surface mostly non-log constructs (error
 * values, throws, span events) whose text never reaches the logs, so it was
 * removed rather than left for the classifier to filter. Project-local
 * wrappers are no longer a documented recall boundary of idiom matching alone
 * (see {@link LOGGER_IDIOM_PATTERNS}) -- the wrapper pass covers that tail.
 */
export async function discoverLoggingSites({
  esClient,
  repository,
  gitSha,
  serviceRoot,
  language,
  logger,
  perPatternLimit = 500,
  maxCandidates = 3000,
  discoverWrappers = true,
}: DiscoverLoggingSitesOptions): Promise<LoggingCandidate[]> {
  const { org, repo } = splitRepository(repository);
  const gitCommit = gitSha || '*';
  const root = serviceRoot.replace(/\/+$/, '');
  const filePath = root ? `${root}/**` : '**';

  const locations = new Set<string>();
  let patternErrors = 0;
  let excludedPaths = 0;

  const runGrep = async (regex: string) => {
    try {
      const lines = await codeGrep({
        esClient,
        gitOrg: org,
        gitRepo: repo,
        gitCommit,
        filePath,
        regex,
        limit: perPatternLimit,
      });
      if (lines.length === perPatternLimit) {
        logger.warn(
          `logging_sites: grep for "${repository}" @ "${root}" pattern ${JSON.stringify(
            regex
          )} reached limit ${perPatternLimit}; path-sorted results may be truncated with alphabetical bias`
        );
      }
      for (const { filePath: path, lineNumber } of lines) {
        // Skip test fixtures and build/CI tooling files: their log-like lines are
        // developer/CI output, not running-service logs. Excluding here (before
        // the +/-1 window fetch and the classifier) also saves classify calls.
        if (isExcludedLoggingPath(path)) {
          excludedPaths += 1;
          continue;
        }
        locations.add(`${path}:${lineNumber}`);
      }
    } catch (error) {
      patternErrors += 1;
      logger.debug(
        `logging_sites: grep failed for "${repository}" @ "${root}" pattern ${JSON.stringify(
          regex
        )}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  for (const regex of LOGGER_IDIOM_PATTERNS) {
    if (locations.size >= maxCandidates) {
      logger.warn(
        `logging_sites: "${repository}" @ "${root}" reached the ${maxCandidates}-candidate ceiling; ` +
          `remaining idiom pattern(s) skipped. Discovery is biased toward the patterns that ran first.`
      );
      break;
    }
    await runGrep(regex);
  }

  // Second pass: find the service's own logging-wrapper function names from
  // the idiom hits just found, then grep their call sites too. Strictly
  // additive -- wrapper hits join the same `locations` set, subject to the
  // same path exclusion and candidate ceiling as idiom hits.
  let wrapperNames: string[] = [];
  let wrapperLocations = 0;
  if (discoverWrappers && locations.size < maxCandidates) {
    wrapperNames = await discoverLoggingWrappers({
      esClient,
      gitOrg: org,
      gitRepo: repo,
      gitCommit,
      filePath,
      language,
      logger,
      idiomHitLocations: [...locations],
      perPatternLimit,
    });

    for (const name of wrapperNames) {
      if (locations.size >= maxCandidates) {
        logger.warn(
          `logging_sites: "${repository}" @ "${root}" reached the ${maxCandidates}-candidate ceiling; ` +
            `remaining wrapper name(s) skipped.`
        );
        break;
      }
      const before = locations.size;
      await runGrep(`.*${escapeLuceneLiteral(name)}[(].*`);
      wrapperLocations += locations.size - before;
    }
  }

  // Fetch +/-1 windows for all hits (batched per file).
  const hitsByFile = new Map<string, Set<number>>();
  for (const location of locations) {
    const idx = location.lastIndexOf(':');
    const path = location.slice(0, idx);
    const lineNumber = Number(location.slice(idx + 1));
    const set = hitsByFile.get(path) ?? new Set<number>();
    set.add(lineNumber);
    hitsByFile.set(path, set);
  }
  const windows = await fetchLineWindows({
    esClient,
    gitOrg: org,
    gitRepo: repo,
    gitCommit,
    hitsByFile,
    logger,
  });

  const candidates: LoggingCandidate[] = [];
  let nonEmitting = 0;
  for (const location of locations) {
    const idx = location.lastIndexOf(':');
    const path = location.slice(0, idx);
    const lineNumber = Number(location.slice(idx + 1));
    const fileLines = windows.get(path);
    // Drop hits whose OWN line cannot emit (declaration, guard, import, error
    // constructor). Judged on the hit line alone so a guard or declaration next
    // to a real logger call cannot suppress that call.
    const hitLine = fileLines?.get(lineNumber);
    if (hitLine && isNonEmittingLine(hitLine)) {
      nonEmitting += 1;
      continue;
    }
    const window = [lineNumber - 1, lineNumber, lineNumber + 1]
      .map((n) => fileLines?.get(n)?.trim())
      .filter((line): line is string => Boolean(line))
      .join('\n');
    candidates.push({
      location,
      content: (window || '').slice(0, 400),
      language,
    });
  }

  logger.debug(
    `logging_sites: discovered ${candidates.length} candidate line(s) for "${repository}" @ "${root}"` +
      (excludedPaths > 0 ? ` (${excludedPaths} test/build path hit(s) excluded)` : '') +
      (nonEmitting > 0 ? ` (${nonEmitting} non-emitting line(s) dropped)` : '') +
      (patternErrors > 0 ? ` (${patternErrors} pattern error(s))` : '') +
      (wrapperNames.length > 0
        ? ` (${wrapperNames.length} wrapper name(s), ${wrapperLocations} wrapper-sourced location(s))`
        : '')
  );
  return candidates;
}
