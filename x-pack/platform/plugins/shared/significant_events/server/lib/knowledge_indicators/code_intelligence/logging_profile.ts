/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  CODE_ANALYSIS_FEATURE_TYPE,
  type Feature,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import type { CodeboxClient } from './codebox_client';

import type { KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import {
  CODE_FEATURE_META_LOGGING_PROFILE_COMMIT,
  CODE_FEATURE_META_LOGGING_PROFILE_GENERATED_AT,
  CODE_FEATURE_META_REPOSITORY,
  CODE_FEATURE_SUBTYPE_LOGGING_PROFILE,
  LOGGING_PROFILE_DRIFT_RATIO,
  OVER_CAPTURE_CEILING,
} from './constants';
import { getRepositoryFeatureStreamName } from './identify_code_features';
import { splitRepository } from './discover_logging_sites';
import type { LoggingProfile, LoggingProfileGrep } from './types';

/** Slug used as the feature `id` for the persisted logging profile. */
const LOGGING_PROFILE_FEATURE_ID = CODE_FEATURE_SUBTYPE_LOGGING_PROFILE;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * Returns true when a regex pattern contains at least one literal character
 * that discriminates against arbitrary input. Strips regex metacharacters
 * (`.`, `*`, `+`, `?`, `^`, `$`, `|`), character classes (`[...]`), grouping
 * (`(`, `)`), and quantifier braces (`{n,m}`) — if nothing remains, the
 * pattern is effectively match-all.
 */
const hasLiteralDiscriminator = (pattern: string): boolean => {
  const stripped = pattern
    // Remove character classes (including negated) and their contents
    .replace(/\[\^?[^\]]*\]/g, '')
    // Remove quantifier braces {n}, {n,}, {n,m}
    .replace(/\{\d+(?:,\d*)?\}/g, '')
    // Remove regex metacharacters and grouping
    .replace(/[.*+?^$|()\\]/g, '');
  return stripped.length > 0;
};

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * Error thrown when {@link writeLoggingProfile} is asked to persist a grep that
 * violates INV-001 (no validated non-zero count) or INV-006 (over-capture ceiling).
 * Carries the offending regex and the reason so the caller can surface it.
 */
export class LoggingProfileValidationError extends Error {
  constructor(
    public readonly regex: string,
    public readonly reason: 'zero_hits' | 'over_capture' | 'match_all',
    message: string
  ) {
    super(message);
    this.name = 'LoggingProfileValidationError';
  }
}

export interface ReadLoggingProfileOptions {
  kiClient: KnowledgeIndicatorClient;
  /** Space that owns the code-only pseudo-stream feature records. */
  spaceId?: string;
  repository: string;
  /**
   * Optional commit filter. When set, returns the profile only if it was validated
   * against this exact commit; otherwise returns `undefined` (a stale profile is
   * treated as absent so the workflow re-runs the agent).
   */
  commit?: string;
}

/**
 * Reads the persisted {@link LoggingProfile} for a repository (optionally filtered
 * by commit). Returns `undefined` when no profile exists, or when a `commit` filter
 * is set and the stored profile was validated against a different commit.
 */
export async function readLoggingProfile({
  kiClient,
  spaceId = 'default',
  repository,
  commit,
}: ReadLoggingProfileOptions): Promise<LoggingProfile | undefined> {
  const streamName = getRepositoryFeatureStreamName(spaceId, repository);
  const { hits } = await kiClient.getFeatures(streamName, {
    type: [CODE_ANALYSIS_FEATURE_TYPE],
    includeExcluded: true,
  });

  const profileFeature = hits.find(
    (feature) => feature.subtype === CODE_FEATURE_SUBTYPE_LOGGING_PROFILE
  );
  if (!profileFeature) {
    return undefined;
  }

  const profile = deserializeProfile(profileFeature);
  if (!profile) {
    return undefined;
  }
  if (commit !== undefined && profile.commit !== commit) {
    return undefined;
  }
  return profile;
}

export interface WriteLoggingProfileOptions {
  kiClient: KnowledgeIndicatorClient;
  /** Space that owns the code-only pseudo-stream feature records. */
  spaceId?: string;
  repository: string;
  /** Immutable commit SHA the greps were validated against. */
  commit: string;
  /** Greps to persist; each is validated against INV-001 / INV-006 before writing. */
  greps: LoggingProfileGrep[];
  /**
   * Repository total line count on the indexed commit, used to recompute the
   * over-capture ratio (INV-006). When omitted, the over-capture check is skipped
   * (the caller is trusted to have already enforced it via the validate tool).
   */
  repoTotalLines?: number;
  /** Over-capture ratio ceiling; defaults to {@link OVER_CAPTURE_CEILING}. */
  ceiling?: number;
  /** Workflow run id stamped on the upserted feature. */
  runId: string;
  /** Called immediately before the write so a paused run cannot continue mutating. */
  beforeWrite?: () => Promise<void>;
  logger: Logger;
}

/**
 * Persists a {@link LoggingProfile} for a repository + commit as a `code_analysis`
 * feature with subtype `logging_profile` on the repository feature stream (the
 * same persistence path the other code-feature subtypes use).
 *
 * Enforces the two persistence invariants before writing:
 * - INV-001: every grep must carry a validated non-zero `expect_call_sites`.
 * - INV-006: no grep's hit ratio (`expect_call_sites / repoTotalLines`) may meet or
 *   exceed the over-capture ceiling.
 *
 * Throws {@link LoggingProfileValidationError} on the first violating grep so the
 * caller surfaces the rejection (Failure Transparency) rather than silently
 * dropping it. An empty `greps` list is a valid profile (the repository has no
 * house wrapper) and is persisted as such so a later run does not re-investigate.
 */
export async function writeLoggingProfile({
  kiClient,
  spaceId = 'default',
  repository,
  commit,
  greps,
  repoTotalLines,
  ceiling = OVER_CAPTURE_CEILING,
  runId,
  beforeWrite,
  logger,
}: WriteLoggingProfileOptions): Promise<LoggingProfile> {
  validateGreps(greps, repoTotalLines, ceiling);

  const generatedAt = new Date().toISOString();
  const profile: LoggingProfile = { repository, commit, greps, generated_at: generatedAt };

  const streamName = getRepositoryFeatureStreamName(spaceId, repository);
  const feature = buildProfileFeature({ profile, streamName, runId });

  await beforeWrite?.();
  await kiClient.bulk(streamName, [{ index: { feature } }]);

  logger.debug(
    `logging_profile: persisted ${greps.length} grep(s) for "${repository}" @ ${commit}`
  );
  return profile;
}

function validateGreps(
  greps: LoggingProfileGrep[],
  repoTotalLines: number | undefined,
  ceiling: number
): void {
  for (const grep of greps) {
    // Guard against match-all patterns. A valid wrapper grep must contain at
    // least one literal character that discriminates (a letter, digit, or
    // escaped literal like `[(]`). Patterns composed entirely of wildcards,
    // quantifiers, and character classes (e.g. `.*`, `.+`, `.*[^x]*.*`) would
    // match the entire repo during drift recounts.
    if (!hasLiteralDiscriminator(grep.regex)) {
      throw new LoggingProfileValidationError(
        grep.regex,
        'match_all',
        `logging_profile: rejecting grep ${JSON.stringify(
          grep.regex
        )} — pattern has no literal discriminator (would match every line)`
      );
    }
    if (!grep.expect_call_sites || grep.expect_call_sites <= 0) {
      throw new LoggingProfileValidationError(
        grep.regex,
        'zero_hits',
        `logging_profile: rejecting grep ${JSON.stringify(
          grep.regex
        )} with no validated non-zero hit count (INV-001)`
      );
    }
    if (
      repoTotalLines !== undefined &&
      repoTotalLines > 0 &&
      grep.expect_call_sites / repoTotalLines >= ceiling
    ) {
      throw new LoggingProfileValidationError(
        grep.regex,
        'over_capture',
        `logging_profile: rejecting grep ${JSON.stringify(grep.regex)} whose hit ratio ${(
          grep.expect_call_sites / repoTotalLines
        ).toFixed(4)} meets or exceeds the over-capture ceiling ${ceiling} (INV-006)`
      );
    }
  }
}

function buildProfileFeature({
  profile,
  streamName,
  runId,
}: {
  profile: LoggingProfile;
  streamName: string;
  runId: string;
}): FeatureUpsert {
  return {
    id: LOGGING_PROFILE_FEATURE_ID,
    stream_name: streamName,
    type: CODE_ANALYSIS_FEATURE_TYPE,
    subtype: CODE_FEATURE_SUBTYPE_LOGGING_PROFILE,
    title: 'Logging profile',
    description: `Repo-specific logging-wrapper greps for ${profile.repository} validated at ${profile.commit}.`,
    properties: {
      repository: profile.repository,
      commit: profile.commit,
      greps: profile.greps,
      generated_at: profile.generated_at,
    },
    confidence: 90,
    evidence: [
      `code: ${profile.repository}@${profile.commit} ${profile.greps.length} validated wrapper grep(s)`,
    ],
    meta: {
      [CODE_FEATURE_META_REPOSITORY]: profile.repository,
      [CODE_FEATURE_META_LOGGING_PROFILE_COMMIT]: profile.commit,
      [CODE_FEATURE_META_LOGGING_PROFILE_GENERATED_AT]: profile.generated_at,
    },
    run_id: runId,
  };
}

function deserializeProfile(feature: Feature): LoggingProfile | undefined {
  const props = feature.properties ?? {};
  const repository = asString(props.repository);
  const commit = asString(props.commit);
  const generatedAt = asString(props.generated_at);
  const rawGreps = Array.isArray(props.greps) ? props.greps : [];
  if (!repository || !commit || !generatedAt) {
    return undefined;
  }
  const greps: LoggingProfileGrep[] = [];
  for (const raw of rawGreps) {
    if (typeof raw !== 'object' || raw === null) continue;
    const regex = asString((raw as Record<string, unknown>).regex);
    const expectCallSites = asNumber((raw as Record<string, unknown>).expect_call_sites);
    const evidence = (raw as Record<string, unknown>).evidence;
    if (!regex || expectCallSites === undefined) continue;
    const evPath = asString((evidence as Record<string, unknown> | undefined)?.path);
    const evLine = asNumber((evidence as Record<string, unknown> | undefined)?.line);
    if (!evPath || evLine === undefined) continue;
    greps.push({
      regex,
      expect_call_sites: expectCallSites,
      evidence: { path: evPath, line: evLine },
    });
  }
  // Tolerate a stored profile whose greps failed to deserialize: treat the profile
  // as absent so the workflow re-investigates rather than silently dropping greps.
  const storedCount = Array.isArray(props.greps) ? props.greps.length : 0;
  if (storedCount !== greps.length) {
    return undefined;
  }
  return { repository, commit, greps, generated_at: generatedAt };
}

/**
 * Per-grep drift result from {@link detectLoggingProfileDrift}. A grep requests
 * refresh when its recount drops to zero or falls by more than the configured
 * ratio. A FAILED count query never requests refresh (INV-002): the profile is
 * kept and the failure is recorded so the caller can surface it without treating
 * a transient query error as evidence the repository changed.
 */
export interface GrepDriftResult {
  /** The regex that was recounted. */
  regex: string;
  /** Stored validated hit count (`expect_call_sites`). */
  expected: number;
  /** Recounted hit count on the indexed commit (`-1` when the query failed). */
  actual: number;
  /** Whether the count query failed (INV-002: NOT a drop). */
  failed: boolean;
  /** Error message when `failed`; `null` otherwise. */
  error: string | null;
  /** Whether this grep requests a refresh. */
  refresh: boolean;
  /** Reason for refresh, when requested; `null` otherwise. */
  reason: 'zero' | 'ratio_drop' | null;
}

/**
 * Overall drift verdict from {@link detectLoggingProfileDrift}. `refresh` is the
 * union of per-grep refresh flags — the value the task-4 gate acts on.
 */
export interface DriftDetectionResult {
  /** True if any grep requests a refresh. */
  refresh: boolean;
  /** Per-grep results, in stored order. */
  greps: GrepDriftResult[];
}

export interface DetectLoggingProfileDriftOptions {
  codebox: CodeboxClient;
  /** Repository as `"org/repo"`. */
  repository: string;
  /** Immutable commit SHA the greps were validated against (and recounted on). */
  gitCommit: string;
  /** The persisted profile to recount. */
  profile: LoggingProfile;
  /**
   * Refresh when a count drops by more than this fraction of its stored value
   * (e.g. `0.5` = a >50% drop). Defaults to {@link LOGGING_PROFILE_DRIFT_RATIO}.
   */
  driftRatio?: number;
  logger: Logger;
}

/**
 * Recounts each grep in a persisted {@link LoggingProfile} against the indexed
 * commit and flags refresh when a count drops to zero or falls by more than the
 * configured ratio. A FAILED count query is NEVER treated as a drop (INV-002):
 * the grep's result is marked `failed`, `refresh` stays false, and the error is
 * recorded so the caller can surface it without invalidating the profile.
 *
 * The recount uses the same parameterised `?regex` binding as `codeGrep` and the
 * validate tool — never string interpolation. Each grep is one ES|QL `STATS`
 * query returning only the hit count (no evidence check needed: the grep was
 * already validated against its evidence at persistence time).
 */
export async function detectLoggingProfileDrift({
  codebox,
  repository,
  gitCommit,
  profile,
  driftRatio = LOGGING_PROFILE_DRIFT_RATIO,
  logger,
}: DetectLoggingProfileDriftOptions): Promise<DriftDetectionResult> {
  const { org, repo } = splitRepository(repository);

  const greps: GrepDriftResult[] = [];
  for (const stored of profile.greps) {
    greps.push(
      await recountOneGrep({
        codebox,
        org,
        repo,
        ref: gitCommit,
        stored,
        driftRatio,
        logger,
      })
    );
  }

  const refresh = greps.some((g) => g.refresh);
  logger.debug(
    `logging_profile: drift detection for "${repository}" @ ${gitCommit} — ` +
      `${greps.length} grep(s), refresh=${refresh}` +
      (greps.some((g) => g.failed)
        ? ` (${greps.filter((g) => g.failed).length} query failure(s) kept)`
        : '')
  );
  return { refresh, greps };
}

async function recountOneGrep({
  codebox,
  org,
  repo,
  ref,
  stored,
  driftRatio,
  logger,
}: {
  codebox: CodeboxClient;
  org: string;
  repo: string;
  ref: string;
  stored: LoggingProfileGrep;
  driftRatio: number;
  logger: Logger;
}): Promise<GrepDriftResult> {
  const expected = stored.expect_call_sites;
  try {
    // Strip leading/trailing .* anchors for ERE compatibility with Codebox grep.
    // If stripping yields an empty string the original was a match-all pattern
    // (e.g. ".*") which would grep the entire repo — skip the recount.
    const stripped = stored.regex.replace(/^\.\*/, '').replace(/\.\*$/, '');
    if (!stripped) {
      return classifyDrift(stored.regex, expected, expected, false, null, driftRatio);
    }
    const erePattern = stripped;
    const hits = await codebox.grep({
      org,
      repo,
      ref,
      pattern: erePattern,
    });
    const actual = hits.length;
    return classifyDrift(stored.regex, expected, actual, false, null, driftRatio);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // INV-002: a failed count query is NOT a drop. Keep the profile; record the failure.
    logger.debug(
      `logging_profile: drift recount failed for ${JSON.stringify(stored.regex)}: ${message}`
    );
    return {
      regex: stored.regex,
      expected,
      actual: -1,
      failed: true,
      error: message,
      refresh: false,
      reason: null,
    };
  }
}

function classifyDrift(
  regex: string,
  expected: number,
  actual: number,
  failed: boolean,
  error: string | null,
  driftRatio: number
): GrepDriftResult {
  // Refresh when the count drops to zero.
  if (actual === 0) {
    return { regex, expected, actual, failed, error, refresh: true, reason: 'zero' };
  }
  // Refresh when the count falls by more than the configured ratio.
  // `expected > 0` is guaranteed by INV-001 at persistence time.
  if (expected > 0 && (expected - actual) / expected > driftRatio) {
    return { regex, expected, actual, failed, error, refresh: true, reason: 'ratio_drop' };
  }
  return { regex, expected, actual, failed, error, refresh: false, reason: null };
}
