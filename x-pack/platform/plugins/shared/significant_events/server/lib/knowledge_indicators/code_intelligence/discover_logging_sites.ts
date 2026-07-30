/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { LOGGER_IDIOM_PATTERNS, SOURCERER_LINES_INDEX } from './constants';
import type { LoggingChunk } from './types';

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

export interface DiscoverLoggingSitesOptions {
  esClient: ElasticsearchClient;
  /** Repository as `"org/repo"`. */
  repository: string;
  /** Immutable commit SHA to scope every grep to. */
  gitSha: string;
  /** Repository-relative service root; grep is confined to `<root>/**`. */
  serviceRoot: string;
  /** Primary language, carried onto each chunk for downstream context. */
  language?: string;
  logger: Logger;
  /** Max lines per idiom pattern (defaults to 500). */
  perPatternLimit?: number;
}

/**
 * Deterministically discovers production logging call sites for one service by
 * grepping the indexed source with a fixed set of logger idioms — the file-
 * finding pass that previously ran through the LLM agent. Returns one
 * {@link LoggingChunk} per matched line (deduplicated by `path:line`), which
 * {@link extractLogSignatures} then parses into log signatures exactly as
 * before, so the downstream Stage-2 pipeline is unchanged.
 */
export async function discoverLoggingSites({
  esClient,
  repository,
  gitSha,
  serviceRoot,
  language,
  logger,
  perPatternLimit = 500,
}: DiscoverLoggingSitesOptions): Promise<LoggingChunk[]> {
  const { org, repo } = splitRepository(repository);
  const root = serviceRoot.replace(/\/+$/, '');
  const filePath = root ? `${root}/**` : '**';

  const byLocation = new Map<string, LoggingChunk>();
  let patternErrors = 0;

  for (const regex of LOGGER_IDIOM_PATTERNS) {
    let lines: GrepLine[];
    try {
      lines = await codeGrep({
        esClient,
        gitOrg: org,
        gitRepo: repo,
        gitCommit: gitSha || '*',
        filePath,
        regex,
        limit: perPatternLimit,
      });
    } catch (error) {
      patternErrors += 1;
      logger.debug(
        `logging_sites: grep failed for "${repository}" @ "${root}" pattern ${JSON.stringify(
          regex
        )}: ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }

    for (const { filePath: path, lineNumber, content } of lines) {
      const location = `${path}:${lineNumber}`;
      if (byLocation.has(location)) {
        continue;
      }
      byLocation.set(location, { content, language, location });
    }
  }

  const chunks = [...byLocation.values()];
  logger.debug(
    `logging_sites: discovered ${chunks.length} logging line(s) for "${repository}" @ "${root}" ` +
      `across ${LOGGER_IDIOM_PATTERNS.length} idiom pattern(s)` +
      (patternErrors > 0 ? ` (${patternErrors} pattern error(s))` : '')
  );
  return chunks;
}
