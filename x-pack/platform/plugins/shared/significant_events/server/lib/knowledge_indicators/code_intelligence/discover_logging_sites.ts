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
  anchoredPhrasePatterns,
  LOGGER_IDIOM_PATTERNS,
  LOGGER_PHRASE_LEXICON,
  SOURCERER_LINES_INDEX,
} from './constants';
import type { LoggingCandidate, LoggingCandidateVia } from './types';

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
 * Greps the Sourcerer line index (`sourcerer-v1-lines*`) with a single Lucene
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
}

/**
 * Deterministically discovers candidate logging call sites for one service by
 * grepping the indexed source with the union of (a) high-confidence logger
 * idioms and (b) the string-anchored phrase lexicon (Stage-3 recall lift). Each
 * candidate carries a +/-1 line window (so multi-line logger calls keep their
 * `logger.x(` context) and a `via` tag (`idiom` = high confidence, `phrase` =
 * needs the classifier to judge). Deduplicated by `path:line`; idiom wins the tag
 * when both match. The classifier ({@link classifyLoggingSites}) then decides
 * keep/drop + level, and kept candidates become {@link LoggingChunk}s.
 */
export async function discoverLoggingSites({
  esClient,
  repository,
  gitSha,
  serviceRoot,
  language,
  logger,
  perPatternLimit = 500,
}: DiscoverLoggingSitesOptions): Promise<LoggingCandidate[]> {
  const { org, repo } = splitRepository(repository);
  const gitCommit = gitSha || '*';
  const root = serviceRoot.replace(/\/+$/, '');
  const filePath = root ? `${root}/**` : '**';

  // Grep the union; record provenance. Idiom patterns are high-confidence log
  // sites; phrase patterns are recall candidates the classifier will judge.
  const via = new Map<string, LoggingCandidateVia>();
  let patternErrors = 0;

  const runGrep = async (regex: string, tag: LoggingCandidateVia) => {
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
      for (const { filePath: path, lineNumber } of lines) {
        const location = `${path}:${lineNumber}`;
        // idiom wins the tag; don't downgrade an idiom hit to phrase.
        if (tag === 'idiom' || !via.has(location)) {
          via.set(location, tag);
        }
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
    await runGrep(regex, 'idiom');
  }
  for (const phrase of LOGGER_PHRASE_LEXICON) {
    for (const regex of anchoredPhrasePatterns(phrase)) {
      await runGrep(regex, 'phrase');
    }
  }

  // Fetch +/-1 windows for all hits (batched per file).
  const hitsByFile = new Map<string, Set<number>>();
  for (const location of via.keys()) {
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
  for (const [location, tag] of via) {
    const idx = location.lastIndexOf(':');
    const path = location.slice(0, idx);
    const lineNumber = Number(location.slice(idx + 1));
    const fileLines = windows.get(path);
    const window = [lineNumber - 1, lineNumber, lineNumber + 1]
      .map((n) => fileLines?.get(n)?.trim())
      .filter((line): line is string => Boolean(line))
      .join('\n');
    candidates.push({
      location,
      content: (window || '').slice(0, 400),
      via: tag,
      language,
    });
  }

  const idiomCount = candidates.filter((c) => c.via === 'idiom').length;
  logger.debug(
    `logging_sites: discovered ${candidates.length} candidate line(s) for "${repository}" @ "${root}" ` +
      `(idiom=${idiomCount} phrase=${candidates.length - idiomCount})` +
      (patternErrors > 0 ? ` (${patternErrors} pattern error(s))` : '')
  );
  return candidates;
}
