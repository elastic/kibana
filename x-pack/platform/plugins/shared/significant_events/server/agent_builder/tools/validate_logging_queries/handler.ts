/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { errors } from '@elastic/elasticsearch';
import {
  OVER_CAPTURE_CEILING,
  SOURCERER_LINES_INDEX,
  SOURCERER_REFS_LOOKUP_INDEX,
} from '../../../lib/knowledge_indicators/code_intelligence/constants';
import { splitRepository } from '../../../lib/knowledge_indicators/code_intelligence/discover_logging_sites';

/**
 * Over-capture ceiling: re-exported from `code_intelligence/constants` so the tool
 * and the persistence layer share one definition. See {@link OVER_CAPTURE_CEILING}.
 */
export { OVER_CAPTURE_CEILING };

/**
 * The 6 internal outcome statuses the handler classifies each grep into. The report
 * shape has no status enum (`pass` + `covers_evidence` + `error` express them), but the
 * classification drives which fields get populated (notably `sample`, fetched only for
 * `ok` / `evidence_missed`). Documented here so tests can assert against the full set
 * (INV-002).
 */
export type GrepValidationStatus =
  | 'ok' // covers_evidence && hit_ratio < ceiling
  | 'over_capture' // covers_evidence && hit_ratio >= ceiling
  | 'evidence_missed' // hits > 0 && !covers_evidence
  | 'zero_hits' // hits == 0, no error
  | 'invalid_syntax' // ES parsing_exception
  | 'query_failed'; // transport / other failure

export interface GrepCandidateInput {
  /** Lucene RLIKE regex; whole-value anchored (wrap in `.*`). A literal paren is `[(]`. */
  regex: string;
  /** The `path:line` the agent based this grep on. */
  evidence: {
    /** Repository-relative file path the grep was written to match. */
    path: string;
    /** Line number in that file the grep was written to match. */
    line: number;
  };
}

export interface GrepValidationResult {
  /** The regex that was validated. */
  grep: string;
  /** `covers_evidence AND hit_ratio < ceiling`. */
  pass: boolean;
  /** Hit count on the indexed commit. Persisted as the drift baseline (`expect_call_sites`). */
  hits: number;
  /** `hits / repo_total_lines` (0 when total is 0). */
  hit_ratio: number;
  /** Whether the grep matched its own evidence line (proves it matched the line it was written for). */
  covers_evidence: boolean;
  /** Populated for `invalid_syntax` / `query_failed`; null otherwise (INV-002). */
  error: string | null;
  /** Up to 3 `path:line` samples, fetched only for `ok` / `evidence_missed`. */
  sample: string[];
  /** Internal classification (not gated; see {@link GrepValidationStatus}). */
  status: GrepValidationStatus;
}

export interface ValidateLoggingQueriesOutput {
  repo_total_lines: number;
  results: GrepValidationResult[];
}

export interface ValidateLoggingQueriesOptions {
  esClient: ElasticsearchClient;
  /** Repository as `"org/repo"`. */
  repository: string;
  /** Immutable commit SHA to scope every grep to. */
  gitCommit: string;
  /**
   * Composite ref key (`git.ref_key`) scoping an incremental (branch-indexed)
   * corpus via a `LOOKUP JOIN`. Defaults to `''` (snapshot mode).
   */
  gitRefKey?: string;
  greps: GrepCandidateInput[];
  /** Over-capture ratio ceiling; defaults to {@link OVER_CAPTURE_CEILING}. */
  ceiling?: number;
  logger: Logger;
}

const STATS_COLUMNS = ['hits', 'covers_evidence'] as const;
const TOTAL_COLUMN = 'total' as const;

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : String(value ?? '');

/**
 * Validates one or more candidate Lucene RLIKE greps against the indexed source for a
 * repository + commit. For each grep, ONE ES|QL `STATS hits, covers_evidence` query
 * returns both the hit count and whether the grep matched its own evidence line, so
 * `covers_evidence` costs no extra round trip. `sample` is the only field needing a
 * second query — fetched `LIMIT 3` and only for `ok` / `evidence_missed`.
 *
 * The `?regex` binding is the same parameterised binding `codeGrep` uses — never string
 * interpolation — so query injection is impossible. A malformed RLIKE throws
 * `parsing_exception` from Elasticsearch; the handler catches it explicitly for
 * `invalid_syntax` and never maps it onto `zero_hits` (INV-002). A parseable-but-wrong
 * pattern legitimately returns 0 with `error: null`.
 */
export async function validateLoggingQueriesHandler({
  esClient,
  repository,
  gitCommit,
  gitRefKey = '',
  greps,
  ceiling = OVER_CAPTURE_CEILING,
  logger,
}: ValidateLoggingQueriesOptions): Promise<ValidateLoggingQueriesOutput> {
  const { org, repo } = splitRepository(repository);
  const gitCommitPattern = gitCommit || '*';

  const repoTotalLines = await countRepoLines(
    esClient,
    org,
    repo,
    gitCommitPattern,
    gitRefKey,
    logger
  );

  const results: GrepValidationResult[] = [];
  for (const candidate of greps) {
    results.push(
      await validateOneGrep({
        esClient,
        org,
        repo,
        gitCommit: gitCommitPattern,
        gitRefKey,
        candidate,
        repoTotalLines,
        ceiling,
        logger,
      })
    );
  }

  return { repo_total_lines: repoTotalLines, results };
}

async function countRepoLines(
  esClient: ElasticsearchClient,
  org: string,
  repo: string,
  gitCommit: string,
  gitRefKey: string,
  logger: Logger
): Promise<number> {
  try {
    const response = (await esClient.esql.query({
      query: `
        FROM ${SOURCERER_LINES_INDEX}
        | WHERE (?git_ref_key == "" AND update_mode == "snapshot"
                    AND git.org LIKE ?git_org AND git.repo LIKE ?git_repo AND git.commit LIKE ?git_commit)
             OR (?git_ref_key != "" AND update_mode == "incremental"
                    AND git.ref_key == ?git_ref_key)
        | EVAL _org = git.org, _repo = git.repo, _commit = git.commit
        | LOOKUP JOIN ${SOURCERER_REFS_LOOKUP_INDEX} ON git.ref_key
        | EVAL git.org = _org, git.repo = _repo, git.commit = COALESCE(git.commit, _commit)
        | WHERE git.commit IS NOT NULL
        | STATS total = COUNT(*)`,
      params: [
        { git_ref_key: gitRefKey },
        { git_org: org },
        { git_repo: repo },
        { git_commit: gitCommit },
      ],
      drop_null_columns: false,
    })) as ESQLSearchResponse;

    const totalCol = response.columns.findIndex((c) => c.name === TOTAL_COLUMN);
    if (totalCol === -1 || response.values.length === 0) {
      return 0;
    }
    return Number(response.values[0][totalCol] ?? 0);
  } catch (error) {
    logger.debug(
      `validate_logging_queries: repo total lines query failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return 0;
  }
}

async function validateOneGrep({
  esClient,
  org,
  repo,
  gitCommit,
  gitRefKey,
  candidate,
  repoTotalLines,
  ceiling,
  logger,
}: {
  esClient: ElasticsearchClient;
  org: string;
  repo: string;
  gitCommit: string;
  gitRefKey: string;
  candidate: GrepCandidateInput;
  repoTotalLines: number;
  ceiling: number;
  logger: Logger;
}): Promise<GrepValidationResult> {
  const { regex, evidence } = candidate;

  try {
    const response = (await esClient.esql.query({
      query: `
        FROM ${SOURCERER_LINES_INDEX}
        | WHERE (?git_ref_key == "" AND update_mode == "snapshot"
                    AND git.org LIKE ?git_org AND git.repo LIKE ?git_repo AND git.commit LIKE ?git_commit)
             OR (?git_ref_key != "" AND update_mode == "incremental"
                    AND git.ref_key == ?git_ref_key)
        | WHERE line.content RLIKE ?regex
        | EVAL _org = git.org, _repo = git.repo, _commit = git.commit
        | LOOKUP JOIN ${SOURCERER_REFS_LOOKUP_INDEX} ON git.ref_key
        | EVAL git.org = _org, git.repo = _repo, git.commit = COALESCE(git.commit, _commit)
        | WHERE git.commit IS NOT NULL
        | EVAL e = CASE(file.path == ?ev_path AND line.number == ?ev_line, 1, 0)
        | STATS hits = COUNT(*), covers_evidence = MAX(e)`,
      params: [
        { git_ref_key: gitRefKey },
        { git_org: org },
        { git_repo: repo },
        { git_commit: gitCommit },
        { regex },
        { ev_path: evidence.path },
        { ev_line: evidence.line },
      ],
      drop_null_columns: false,
    })) as ESQLSearchResponse;

    const hitsCol = response.columns.findIndex((c) => c.name === STATS_COLUMNS[0]);
    const coversCol = response.columns.findIndex((c) => c.name === STATS_COLUMNS[1]);
    if (hitsCol === -1 || coversCol === -1 || response.values.length === 0) {
      // No rows means zero hits with no error — a parseable-but-empty result.
      return zeroHitResult(regex);
    }

    const hits = Number(response.values[0][hitsCol] ?? 0);
    const coversEvidence = Number(response.values[0][coversCol] ?? 0) === 1;
    const hitRatio = repoTotalLines > 0 ? hits / repoTotalLines : 0;

    const status = classifyStatus(hits, coversEvidence, hitRatio, ceiling);
    const pass = coversEvidence && hitRatio < ceiling;

    let sample: string[] = [];
    if (status === 'ok' || status === 'evidence_missed') {
      sample = await fetchSample(esClient, org, repo, gitCommit, gitRefKey, regex, logger);
    }

    return {
      grep: regex,
      pass,
      hits,
      hit_ratio: hitRatio,
      covers_evidence: coversEvidence,
      error: null,
      sample,
      status,
    };
  } catch (error) {
    const parsed = parseEsError(error);
    if (parsed.type === 'parsing_exception') {
      // INV-002: a malformed RLIKE surfaces in `error`, never as `hits: 0`.
      return {
        grep: regex,
        pass: false,
        hits: 0,
        hit_ratio: 0,
        covers_evidence: false,
        error: parsed.message,
        sample: [],
        status: 'invalid_syntax',
      };
    }
    logger.debug(
      `validate_logging_queries: query failed for ${JSON.stringify(regex)}: ${parsed.message}`
    );
    return {
      grep: regex,
      pass: false,
      hits: 0,
      hit_ratio: 0,
      covers_evidence: false,
      error: parsed.message,
      sample: [],
      status: 'query_failed',
    };
  }
}

function classifyStatus(
  hits: number,
  coversEvidence: boolean,
  hitRatio: number,
  ceiling: number
): GrepValidationStatus {
  if (hits === 0) {
    return 'zero_hits';
  }
  if (coversEvidence && hitRatio >= ceiling) {
    return 'over_capture';
  }
  if (!coversEvidence) {
    return 'evidence_missed';
  }
  return 'ok';
}

function zeroHitResult(regex: string): GrepValidationResult {
  return {
    grep: regex,
    pass: false,
    hits: 0,
    hit_ratio: 0,
    covers_evidence: false,
    error: null,
    sample: [],
    status: 'zero_hits',
  };
}

async function fetchSample(
  esClient: ElasticsearchClient,
  org: string,
  repo: string,
  gitCommit: string,
  gitRefKey: string,
  regex: string,
  logger: Logger
): Promise<string[]> {
  try {
    const response = (await esClient.esql.query({
      query: `
        FROM ${SOURCERER_LINES_INDEX}
        | WHERE (?git_ref_key == "" AND update_mode == "snapshot"
                    AND git.org LIKE ?git_org AND git.repo LIKE ?git_repo AND git.commit LIKE ?git_commit)
             OR (?git_ref_key != "" AND update_mode == "incremental"
                    AND git.ref_key == ?git_ref_key)
        | WHERE line.content RLIKE ?regex
        | EVAL _org = git.org, _repo = git.repo, _commit = git.commit
        | LOOKUP JOIN ${SOURCERER_REFS_LOOKUP_INDEX} ON git.ref_key
        | EVAL git.org = _org, git.repo = _repo, git.commit = COALESCE(git.commit, _commit)
        | WHERE git.commit IS NOT NULL
        | KEEP file.path, line.number
        | SORT file.path, line.number
        | LIMIT 3`,
      params: [
        { git_ref_key: gitRefKey },
        { git_org: org },
        { git_repo: repo },
        { git_commit: gitCommit },
        { regex },
      ],
      drop_null_columns: false,
    })) as ESQLSearchResponse;

    const pathCol = response.columns.findIndex((c) => c.name === 'file.path');
    const lineCol = response.columns.findIndex((c) => c.name === 'line.number');
    if (pathCol === -1 || lineCol === -1) {
      return [];
    }
    return response.values.map((row) => `${asString(row[pathCol])}:${Number(row[lineCol] ?? 0)}`);
  } catch (error) {
    // A failed sample fetch is non-fatal; the stats already classified the grep.
    logger.debug(
      `validate_logging_queries: sample fetch failed for ${JSON.stringify(regex)}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
}

interface ParsedEsError {
  message: string;
  type?: string;
}

function parseEsError(error: unknown): ParsedEsError {
  if (error instanceof errors.ResponseError) {
    const type = error.body?.error?.type;
    const reason = error.body?.error?.reason;
    return {
      message: typeof reason === 'string' ? reason : error.message,
      type: typeof type === 'string' ? type : undefined,
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: String(error) };
}
