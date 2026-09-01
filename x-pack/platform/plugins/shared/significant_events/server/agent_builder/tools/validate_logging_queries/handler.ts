/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { OVER_CAPTURE_CEILING } from '../../../lib/knowledge_indicators/code_intelligence/constants';
import { splitRepository } from '../../../lib/knowledge_indicators/code_intelligence/discover_logging_sites';
import type { CodeboxClient } from '../../../lib/knowledge_indicators/code_intelligence/codebox_client';

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
  | 'invalid_syntax' // regex parsing error
  | 'query_failed'; // transport / other failure

export interface GrepCandidateInput {
  /** ERE regex pattern (Codebox grep uses extended regex). */
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
  codebox: CodeboxClient;
  /** Repository as `"org/repo"`. */
  repository: string;
  /** Immutable commit SHA to scope every grep to. */
  gitCommit: string;
  greps: GrepCandidateInput[];
  /** Over-capture ratio ceiling; defaults to {@link OVER_CAPTURE_CEILING}. */
  ceiling?: number;
  logger: Logger;
}

/**
 * Strips the leading/trailing `.*` anchors from a Lucene RLIKE pattern to
 * produce an equivalent ERE pattern for Codebox grep.
 */
const rlikeToEre = (rlike: string): string =>
  rlike.replace(/^\.\*/, '').replace(/\.\*$/, '') || rlike;

/**
 * Validates one or more candidate regex greps against the repository via Codebox.
 * For each grep, one Codebox grep call returns both the hit count and whether the
 * grep matched its own evidence line (checked client-side), so `covers_evidence`
 * costs no extra round trip. `sample` is the first 3 `path:line` hits.
 */
export async function validateLoggingQueriesHandler({
  codebox,
  repository,
  gitCommit,
  greps,
  ceiling = OVER_CAPTURE_CEILING,
  logger,
}: ValidateLoggingQueriesOptions): Promise<ValidateLoggingQueriesOutput> {
  const { org, repo } = splitRepository(repository);
  const ref = gitCommit;

  const repoTotalLines = await countRepoLines(codebox, org, repo, ref, logger);

  const results: GrepValidationResult[] = [];
  for (const candidate of greps) {
    results.push(
      await validateOneGrep({
        codebox,
        org,
        repo,
        ref,
        candidate,
        repoTotalLines,
        ceiling,
        logger,
      })
    );
  }

  return { repo_total_lines: repoTotalLines, results };
}

/**
 * Counts total lines in the repository at the given ref by grepping for a
 * universal pattern. This is an approximation — Codebox grep returns matched
 * lines, not total lines, so we grep for `.*` which matches every non-empty line.
 */
async function countRepoLines(
  codebox: CodeboxClient,
  org: string,
  repo: string,
  ref: string,
  logger: Logger
): Promise<number> {
  try {
    // Use a very high maxCount to approximate total lines; Codebox streams so
    // this is bounded by the repo size rather than memory.
    const hits = await codebox.grep({
      org,
      repo,
      ref,
      pattern: '.',
      maxCount: 1_000_000,
    });
    return hits.length;
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
  codebox,
  org,
  repo,
  ref,
  candidate,
  repoTotalLines,
  ceiling,
  logger,
}: {
  codebox: CodeboxClient;
  org: string;
  repo: string;
  ref: string;
  candidate: GrepCandidateInput;
  repoTotalLines: number;
  ceiling: number;
  logger: Logger;
}): Promise<GrepValidationResult> {
  const { regex, evidence } = candidate;

  try {
    const hits = await codebox.grep({
      org,
      repo,
      ref,
      pattern: rlikeToEre(regex),
    });

    const hitCount = hits.length;
    const coversEvidence = hits.some(
      (hit) => hit.path === evidence.path && hit.lineNumber === evidence.line
    );
    const hitRatio = repoTotalLines > 0 ? hitCount / repoTotalLines : 0;

    const status = classifyStatus(hitCount, coversEvidence, hitRatio, ceiling);
    const pass = coversEvidence && hitRatio < ceiling;

    const sample =
      status === 'ok' || status === 'evidence_missed'
        ? hits.slice(0, 3).map((hit) => `${hit.path}:${hit.lineNumber}`)
        : [];

    return {
      grep: regex,
      pass,
      hits: hitCount,
      hit_ratio: hitRatio,
      covers_evidence: coversEvidence,
      error: null,
      sample,
      status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Check if it's a regex syntax error (Codebox returns 400 for bad patterns)
    const isSyntaxError = message.includes('400') || message.includes('invalid');
    if (isSyntaxError) {
      return {
        grep: regex,
        pass: false,
        hits: 0,
        hit_ratio: 0,
        covers_evidence: false,
        error: message,
        sample: [],
        status: 'invalid_syntax',
      };
    }
    logger.debug(`validate_logging_queries: query failed for ${JSON.stringify(regex)}: ${message}`);
    return {
      grep: regex,
      pass: false,
      hits: 0,
      hit_ratio: 0,
      covers_evidence: false,
      error: message,
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
