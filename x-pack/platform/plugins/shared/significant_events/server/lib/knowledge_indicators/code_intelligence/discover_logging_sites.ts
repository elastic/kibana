/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isExcludedLoggingPath, isNonEmittingLine, LOGGER_IDIOM_PATTERNS } from './constants';
import type { CodeboxClient } from './codebox_client';
import type { LoggingCandidate } from './types';

/** One matched source line returned by {@link codeGrep}. */
export interface GrepLine {
  filePath: string;
  lineNumber: number;
  content: string;
}

export interface CodeGrepOptions {
  codebox: CodeboxClient;
  /** Git org. */
  gitOrg: string;
  /** Git repo name. */
  gitRepo: string;
  /** Ref (branch, tag, or commit SHA) to scope the grep to. */
  ref: string;
  /** File-path glob, e.g. `src/foo/` (scoped via Codebox `path` param). */
  filePath?: string;
  /** ERE regex pattern (Codebox uses `extendedRegex: true` by default). */
  regex: string;
  /** Max lines to return. */
  limit: number;
}

/**
 * Strips the leading/trailing `.*` anchors from a Lucene RLIKE pattern to
 * produce an equivalent ERE pattern for `git grep --extended-regexp`. Lucene
 * RLIKE is implicitly anchored (`^...$`), so `.*foo.*` matches any line
 * containing `foo`; ERE is unanchored by default, so `foo` suffices.
 */
const rlikeToEre = (rlike: string): string =>
  rlike.replace(/^\.\*/, '').replace(/\.\*$/, '') || rlike;

/**
 * Greps file contents via the Codebox grep endpoint. This is the server-side
 * replacement for the ES|QL-over-Sourcerer `codeGrep` function. Results are
 * scoped to a single org/repo/ref.
 *
 * Never throws: a query failure (bad regex, missing repo) yields an empty
 * result so one bad idiom can't abort discovery for a whole service.
 */
export async function codeGrep({
  codebox,
  gitOrg,
  gitRepo,
  ref,
  filePath,
  regex,
  limit,
}: CodeGrepOptions): Promise<GrepLine[]> {
  const hits = await codebox.grep({
    org: gitOrg,
    repo: gitRepo,
    ref,
    pattern: rlikeToEre(regex),
    path: filePath,
    maxCount: limit,
  });

  return hits.map((hit) => ({
    filePath: hit.path,
    lineNumber: hit.lineNumber,
    content: hit.content,
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
 * matched line can be presented with its +/-1 neighbours. Uses Codebox `show`
 * with line-range selection; never throws (a failed file is skipped).
 */
/** Default concurrency for parallel Codebox calls. */
const WINDOW_CONCURRENCY = 10;

export async function fetchLineWindows({
  codebox,
  gitOrg,
  gitRepo,
  ref,
  hitsByFile,
  logger,
}: {
  codebox: CodeboxClient;
  gitOrg: string;
  gitRepo: string;
  ref: string;
  /** file path -> set of matched line numbers. */
  hitsByFile: Map<string, Set<number>>;
  logger: Logger;
}): Promise<Map<string, Map<number, string>>> {
  const out = new Map<string, Map<number, string>>();
  const entries = [...hitsByFile.entries()];

  // Fetch all file windows in parallel with bounded concurrency.
  let next = 0;
  const worker = async () => {
    while (next < entries.length) {
      const idx = next++;
      const [path, lineNumbers] = entries[idx];
      const wanted = new Set<number>();
      for (const n of lineNumbers) {
        wanted.add(n - 1);
        wanted.add(n);
        wanted.add(n + 1);
      }
      const lo = Math.max(1, Math.min(...wanted));
      const hi = Math.max(...wanted);

      try {
        const text = await codebox.show({
          org: gitOrg,
          repo: gitRepo,
          ref,
          path,
          lines: `${lo}-${hi}`,
        });

        const fileLines = new Map<number, string>();
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          fileLines.set(lo + i, lines[i]);
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
  };

  await Promise.all(
    Array.from({ length: Math.min(WINDOW_CONCURRENCY, entries.length) }, () => worker())
  );
  return out;
}

export interface DiscoverLoggingSitesOptions {
  codebox: CodeboxClient;
  /** Repository as `"org/repo"`. */
  repository: string;
  /** Immutable commit SHA to scope every grep to. */
  gitSha: string;
  /** Repository-relative service root; grep is confined to `<root>/`. */
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
   * Repo-specific idiom greps from a persisted {@link LoggingProfile} (the
   * `regex` of each profile grep). When present and {@link useLoggingProfile}
   * is true (the default), they run alongside {@link LOGGER_IDIOM_PATTERNS} and
   * their hits merge into the same candidate set under the same filters. Profile
   * greps are additive: they may add candidate locations; they may never remove
   * or replace an idiom hit (INV-004).
   */
  profileGreps?: string[];
  /**
   * Whether to run {@link profileGreps}. Defaults to `true`; a caller can disable
   * the profile lane (e.g. to compare idiom-only recall) by passing `false`.
   */
  useLoggingProfile?: boolean;
}

/**
 * Deterministically discovers candidate logging call sites for one service by
 * grepping the indexed source with the logger idiom patterns. Each candidate
 * carries a +/-1 line window, so multi-line logger calls keep their `logger.x(`
 * context. Deduplicated by `path:line`. The classifier
 * ({@link classifyLoggingSites}) then decides keep/drop + level, and kept
 * candidates become {@link LoggingChunk}s.
 */
export async function discoverLoggingSites({
  codebox,
  repository,
  gitSha,
  serviceRoot,
  language,
  logger,
  perPatternLimit = 500,
  maxCandidates = 3000,
  profileGreps = [],
  useLoggingProfile = true,
}: DiscoverLoggingSitesOptions): Promise<LoggingCandidate[]> {
  const { org, repo } = splitRepository(repository);
  const ref = gitSha;
  const root = serviceRoot.replace(/^\.[\/\\]?$/, '').replace(/\/+$/, '');
  const filePath = root ? `${root}/` : undefined;

  const locations = new Set<string>();
  let patternErrors = 0;
  let excludedPaths = 0;

  const profileGrepsToRun = useLoggingProfile ? profileGreps : [];

  const runGrep = async (regex: string) => {
    try {
      const lines = await codeGrep({
        codebox,
        gitOrg: org,
        gitRepo: repo,
        ref,
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

  const runGrepsUnderCeiling = async (regexes: readonly string[]): Promise<number> => {
    let ran = 0;
    for (const regex of regexes) {
      if (locations.size >= maxCandidates) {
        logger.warn(
          `logging_sites: "${repository}" @ "${root}" reached the ${maxCandidates}-candidate ceiling; ` +
            `remaining pattern(s) skipped. Discovery is biased toward the patterns that ran first.`
        );
        break;
      }
      await runGrep(regex);
      ran += 1;
    }
    return ran;
  };

  await runGrepsUnderCeiling(LOGGER_IDIOM_PATTERNS);

  const idiomLocations = locations.size;
  const profileRan = await runGrepsUnderCeiling(profileGrepsToRun);
  const profileContributed = locations.size - idiomLocations;

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
    codebox,
    gitOrg: org,
    gitRepo: repo,
    ref,
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
      (profileGrepsToRun.length > 0
        ? ` (${profileRan}/${profileGrepsToRun.length} profile grep(s) ran, contributed ${profileContributed} location(s))`
        : '')
  );
  return candidates;
}
