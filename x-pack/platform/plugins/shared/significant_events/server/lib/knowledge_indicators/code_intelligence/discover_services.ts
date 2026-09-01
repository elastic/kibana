/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { IAC_PATH_MARKERS, MANIFEST_PATH_PATTERNS, SERVICE_DEPLOY_MARKERS } from './constants';
import type { CodeboxClient } from './codebox_client';
import type {
  IacSignal,
  IacKind,
  IndexedRepoRef,
  LanguageCount,
  ServiceCandidateRoot,
} from './types';

/** Default concurrency for parallel Codebox calls within one function. */
const DEFAULT_CONCURRENCY = 10;

/**
 * Runs `fn` over `items` with bounded concurrency. Errors in individual items
 * are caught and returned as `undefined` so one failure doesn't abort the batch.
 */
async function pMap<T, R>(
  items: readonly T[],
  fn: (item: T) => Promise<R>,
  concurrency = DEFAULT_CONCURRENCY
): Promise<Array<R | undefined>> {
  const results: Array<R | undefined> = new Array(items.length);
  let next = 0;

  const worker = async () => {
    while (next < items.length) {
      const idx = next++;
      try {
        results[idx] = await fn(items[idx]);
      } catch {
        results[idx] = undefined;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

/**
 * Builds a repository language histogram using the Codebox languages endpoint.
 * Returns byte-weighted language counts so a repo's dominant language reflects
 * real code volume. Never throws — a request failure yields an empty histogram.
 */
export async function buildLanguageHistogram({
  codebox,
  repo,
  logger,
}: {
  codebox: CodeboxClient;
  repo: IndexedRepoRef;
  logger: Logger;
}): Promise<LanguageCount[]> {
  const { org, repo: repoName, gitSha, repository } = repo;
  try {
    const histogram = await codebox.languages({ org, repo: repoName, ref: gitSha });

    return Object.entries(histogram)
      .map(([language, { bytes }]) => ({ language, count: bytes }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    logger.debug(
      `discover_services: language histogram failed for "${repository}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
}

const MANIFEST_CONTENT_PATTERNS: readonly string[] = [
  '.*image:.*',
  '.*container_name:.*',
  '.*kind: ?(Deployment|StatefulSet|DaemonSet|CronJob).*',
  '.*app[.]kubernetes[.]io/name.*',
] as const;

const SERVICE_NAME_PATTERNS: readonly string[] = [
  '.*OTEL_SERVICE_NAME.*',
  '.*OTEL_RESOURCE_ATTRIBUTES.*',
  '.*spring[.]application[.]name.*',
] as const;

const ENTRYPOINT_PATTERNS: readonly string[] = [
  '.*func main[(].*',
  '.*public static void main.*',
  '.*if __name__ == .__main__..*',
  '.*http[.]ListenAndServe.*',
  '.*app[.]listen[(].*',
  '.*@SpringBootApplication.*',
] as const;

const EVIDENCE_LINE_LIMIT = 100;

const README_PATH_PATTERN = '[Rr][Ee][Aa][Dd][Mm][Ee]([.][A-Za-z0-9]+)?';
const README_LINE_LIMIT = 40;

/**
 * Lists repositories cloned and ready in Codebox. Resolves HEAD commit SHAs
 * in parallel. Never throws — a missing repo yields an empty list.
 */
export async function listIndexedRepos({
  codebox,
  logger,
}: {
  codebox: CodeboxClient;
  logger: Logger;
}): Promise<IndexedRepoRef[]> {
  try {
    const repos = await codebox.listRepos();
    const readyRepos = repos.filter((r) => r.status === 'ready');

    const resolved = await pMap(readyRepos, async ({ name }) => {
      const parts = name.split('/');
      if (parts.length !== 2) return undefined;
      const [org, repo] = parts;

      const headSha = await codebox.resolveHead(org, repo);
      if (!headSha) return undefined;

      return {
        repository: name,
        org,
        repo,
        gitSha: headSha,
        ref: 'HEAD',
      } as IndexedRepoRef;
    });

    return resolved
      .filter((r): r is IndexedRepoRef => r != null)
      .sort((a, b) => a.repository.localeCompare(b.repository));
  } catch (error) {
    logger.warn(
      `discover_services: failed to list indexed repos: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
}

/** Repository-relative directory of a file path (`""` for a repo-root file). */
const dirOf = (path: string): string => {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
};

/**
 * Strips the leading/trailing `.*` anchors from a Lucene RLIKE pattern to
 * produce an equivalent ERE pattern for `git grep --extended-regexp`.
 */
const rlikeToEre = (rlike: string): string =>
  rlike.replace(/^\.\*/, '').replace(/\.\*$/, '') || rlike;

/**
 * Lists file paths in a repository matching a path regex pattern.
 *
 * Uses Codebox's `tree` endpoint with `recursive: true, nameOnly: true` to get
 * a flat list of all repo-relative file paths in one call (`git ls-tree -r
 * --name-only`), then filters client-side against the RLIKE-derived regex.
 *
 * When `allPaths` is provided, the API call is skipped (caller pre-fetched it
 * once and shares across multiple `listPaths` calls for the same repo).
 */
async function listPaths({
  codebox,
  org,
  repo,
  ref,
  pattern,
  limit,
  allPaths,
}: {
  codebox: CodeboxClient;
  org: string;
  repo: string;
  ref: string;
  pattern: string;
  limit: number;
  /** Pre-fetched full file listing to avoid redundant API calls. */
  allPaths?: string[];
}): Promise<string[]> {
  const ere = rlikeToEre(pattern);
  let regex: RegExp;
  try {
    regex = new RegExp(ere);
  } catch {
    regex = new RegExp(ere.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }

  const filePaths =
    allPaths ??
    ((await codebox.tree({ org, repo, ref, recursive: true, nameOnly: true })) as string[]);

  const matched: string[] = [];
  for (const path of filePaths) {
    if (regex.test(path)) {
      matched.push(path);
      if (matched.length >= limit) break;
    }
  }
  return matched.sort();
}

interface EvidenceLine {
  filePath: string;
  lineNumber: number;
  content: string;
}

/**
 * Greps line contents via Codebox, optionally restricted to a known set of
 * file paths.
 */
async function grepLines({
  codebox,
  org,
  repo,
  ref,
  pattern,
  filePaths,
  limit,
}: {
  codebox: CodeboxClient;
  org: string;
  repo: string;
  ref: string;
  pattern: string;
  filePaths?: string[];
  limit: number;
}): Promise<EvidenceLine[]> {
  const hits = await codebox.grep({
    org,
    repo,
    ref,
    pattern: rlikeToEre(pattern),
    maxCount: filePaths ? undefined : limit,
  });

  const pathSet = filePaths ? new Set(filePaths) : undefined;
  const result: EvidenceLine[] = [];
  for (const hit of hits) {
    if (pathSet && !pathSet.has(hit.path)) continue;
    result.push({
      filePath: hit.path,
      lineNumber: hit.lineNumber,
      content: hit.content,
    });
    if (result.length >= limit) break;
  }
  return result;
}

const formatEvidenceLine = ({ filePath, lineNumber, content }: EvidenceLine): string =>
  `${filePath}:${lineNumber}\t${content}`;

/** Reads the first `limit` lines of one file via Codebox show. */
async function readFileHead({
  codebox,
  org,
  repo,
  ref,
  filePath,
  limit,
}: {
  codebox: CodeboxClient;
  org: string;
  repo: string;
  ref: string;
  filePath: string;
  limit: number;
}): Promise<string[]> {
  const text = await codebox.show({ org, repo, ref, path: filePath, head: limit });
  return text.split('\n');
}

/** Escapes a literal basename for use inside an ERE pattern (dots -> `[.]`). */
const escapeForPattern = (basename: string): string => basename.replace(/\./g, '[.]');

export interface DiscoverCandidateRootsOptions {
  codebox: CodeboxClient;
  repo: IndexedRepoRef;
  logger: Logger;
  /** Max matching files per marker pattern (defaults to 500). */
  perMarkerLimit?: number;
}

export interface DiscoverCandidateRootsResult {
  candidates: ServiceCandidateRoot[];
  manifestPaths: string[];
  manifestLines: string[];
  serviceNameLines: string[];
  iacSignals: IacSignal[];
  readmeLines: string[];
}

/**
 * Deterministically finds candidate service roots and supporting classification
 * evidence in one repository. Greps run in parallel for speed. No LLM.
 */
export async function discoverCandidateRoots({
  codebox,
  repo,
  logger,
  perMarkerLimit = 500,
}: DiscoverCandidateRootsOptions): Promise<DiscoverCandidateRootsResult> {
  const { org, repo: repoName, gitSha, repository } = repo;
  const ref = gitSha;
  const rootMarkers = new Map<string, Set<string>>();
  const rootLanguages = new Map<string, Set<string>>();

  // Pre-fetch the full file listing once so all listPaths calls share it.
  // Uses `git ls-tree -r --name-only` via the recursive+nameOnly tree endpoint.
  let allPaths: string[];
  try {
    allPaths = (await codebox.tree({
      org,
      repo: repoName,
      ref,
      recursive: true,
      nameOnly: true,
    })) as string[];
  } catch (error) {
    logger.debug(
      `discover_services: file listing failed for "${repository}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    allPaths = [];
  }

  // --- Phase 1: run all marker, manifest, service-name, entrypoint, and IaC
  // greps in parallel. Each returns its own result set; we merge afterward.

  // 1a. Service deploy marker greps
  const markerResults = await pMap(SERVICE_DEPLOY_MARKERS, async (markerDef) => {
    const { marker, language, patternOverride, basenameMatches } = markerDef;
    const pattern = patternOverride ?? `.*${escapeForPattern(marker)}`;
    try {
      const paths = await listPaths({
        codebox,
        org,
        repo: repoName,
        ref,
        pattern,
        limit: perMarkerLimit,
        allPaths,
      });
      if (paths.length === perMarkerLimit) {
        logger.warn(
          `discover_services: marker grep for "${repository}" pattern ${JSON.stringify(
            pattern
          )} reached limit ${perMarkerLimit}`
        );
      }
      return { marker, language, basenameMatches, paths };
    } catch (error) {
      logger.debug(
        `discover_services: marker grep failed for "${repository}" marker ${JSON.stringify(
          marker
        )}: ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  });

  for (const result of markerResults) {
    if (!result) continue;
    const { marker, language, basenameMatches, paths } = result;
    for (const path of paths) {
      const base = path.slice(path.lastIndexOf('/') + 1);
      const matches = basenameMatches
        ? basenameMatches(base)
        : base === marker || base.endsWith(marker);
      if (!matches) continue;
      const root = dirOf(path);
      const markers = rootMarkers.get(root) ?? new Set<string>();
      markers.add(marker);
      rootMarkers.set(root, markers);
      if (language) {
        const langs = rootLanguages.get(root) ?? new Set<string>();
        langs.add(language);
        rootLanguages.set(root, langs);
      }
    }
  }

  // 1b. Manifest paths, service names, entrypoints, IaC — all in parallel
  const [manifestPathResults, serviceNameResults, entrypointResults, iacResults, readmeResult] =
    await Promise.all([
      // Manifest path greps
      pMap(MANIFEST_PATH_PATTERNS, async (pattern) => {
        try {
          const paths = await listPaths({
            codebox,
            org,
            repo: repoName,
            ref,
            pattern,
            limit: perMarkerLimit,
            allPaths,
          });
          if (paths.length === perMarkerLimit) {
            logger.warn(
              `discover_services: manifest-path grep for "${repository}" pattern ${JSON.stringify(
                pattern
              )} reached limit ${perMarkerLimit}`
            );
          }
          return paths;
        } catch (error) {
          logger.debug(
            `discover_services: manifest grep failed for "${repository}" pattern ${JSON.stringify(
              pattern
            )}: ${error instanceof Error ? error.message : String(error)}`
          );
          return undefined;
        }
      }),

      // Service name greps
      pMap(SERVICE_NAME_PATTERNS, async (pattern) => {
        try {
          return await grepLines({
            codebox,
            org,
            repo: repoName,
            ref,
            pattern,
            limit: EVIDENCE_LINE_LIMIT,
          });
        } catch (error) {
          logger.debug(
            `discover_services: service-name grep failed for "${repository}" pattern ${JSON.stringify(
              pattern
            )}: ${error instanceof Error ? error.message : String(error)}`
          );
          return undefined;
        }
      }),

      // Entrypoint greps
      pMap(ENTRYPOINT_PATTERNS, async (pattern) => {
        try {
          return await grepLines({
            codebox,
            org,
            repo: repoName,
            ref,
            pattern,
            limit: EVIDENCE_LINE_LIMIT,
          });
        } catch (error) {
          logger.debug(
            `discover_services: entrypoint grep failed for "${repository}" pattern ${JSON.stringify(
              pattern
            )}: ${error instanceof Error ? error.message : String(error)}`
          );
          return undefined;
        }
      }),

      // IaC marker greps
      pMap(IAC_PATH_MARKERS, async ({ pattern, kind }) => {
        try {
          const paths = await listPaths({
            codebox,
            org,
            repo: repoName,
            ref,
            pattern,
            limit: 1,
            allPaths,
          });
          return paths.length > 0 ? { kind: kind as IacKind, path: paths[0] } : undefined;
        } catch {
          return undefined;
        }
      }),

      // README
      (async () => {
        try {
          const readmePaths = await listPaths({
            codebox,
            org,
            repo: repoName,
            ref,
            pattern: README_PATH_PATTERN,
            limit: perMarkerLimit,
            allPaths,
          });
          const rootReadme = readmePaths
            .filter((path) => !path.includes('/'))
            .sort((a, b) => a.localeCompare(b))[0];
          if (rootReadme) {
            return await readFileHead({
              codebox,
              org,
              repo: repoName,
              ref,
              filePath: rootReadme,
              limit: README_LINE_LIMIT,
            });
          }
          return [];
        } catch (error) {
          logger.debug(
            `discover_services: README read failed for "${repository}": ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return [];
        }
      })(),
    ]);

  // --- Phase 2: merge parallel results

  // Manifest paths
  const manifestPaths = new Set<string>();
  for (const paths of manifestPathResults) {
    if (paths) paths.forEach((path) => manifestPaths.add(path));
  }
  const sortedManifestPaths = [...manifestPaths].sort();

  // Manifest content greps (need sorted manifest paths from above, so run after phase 1)
  let manifestLines: string[] = [];
  if (sortedManifestPaths.length > 0) {
    const contentResults = await pMap(MANIFEST_CONTENT_PATTERNS, async (pattern) => {
      try {
        return await grepLines({
          codebox,
          org,
          repo: repoName,
          ref,
          pattern,
          filePaths: sortedManifestPaths,
          limit: EVIDENCE_LINE_LIMIT,
        });
      } catch (error) {
        logger.debug(
          `discover_services: manifest-content grep failed for "${repository}" pattern ${JSON.stringify(
            pattern
          )}: ${error instanceof Error ? error.message : String(error)}`
        );
        return undefined;
      }
    });
    manifestLines = contentResults
      .filter((r): r is EvidenceLine[] => r != null)
      .flat()
      .map(formatEvidenceLine)
      .slice(0, EVIDENCE_LINE_LIMIT);
  }

  // Service name lines
  const serviceNameLines = serviceNameResults
    .filter((r): r is EvidenceLine[] => r != null)
    .flat()
    .map(formatEvidenceLine)
    .slice(0, EVIDENCE_LINE_LIMIT);

  // Entrypoint paths
  const entrypointPaths = new Set<string>();
  for (const lines of entrypointResults) {
    if (lines) lines.forEach(({ filePath }) => entrypointPaths.add(filePath));
  }

  // Candidates
  const candidates: ServiceCandidateRoot[] = [];
  for (const [serviceRoot, markers] of rootMarkers) {
    const langs = rootLanguages.get(serviceRoot);
    candidates.push({
      repository,
      gitSha,
      serviceRoot,
      markers: [...markers].sort(),
      language: langs && langs.size > 0 ? [...langs].sort()[0] : 'unknown',
      hasEntrypoint:
        (serviceRoot === '' && entrypointPaths.size > 0) ||
        [...entrypointPaths].some((path) => path.startsWith(`${serviceRoot}/`)),
    });
  }
  candidates.sort((a, b) => a.serviceRoot.localeCompare(b.serviceRoot));

  // IaC signals (deduplicate by kind)
  const iacByKind = new Map<IacKind, string>();
  for (const result of iacResults) {
    if (result && !iacByKind.has(result.kind)) {
      iacByKind.set(result.kind, result.path);
    }
  }
  const iacSignals: IacSignal[] = [...iacByKind].map(([kind, path]) => ({ kind, path }));

  const readmeLines = readmeResult ?? [];

  logger.debug(
    `discover_services: "${repository}" -> ${candidates.length} candidate root(s), ` +
      `${manifestPaths.size} manifest file(s), ${iacSignals.length} IaC signal(s)`
  );

  return {
    candidates,
    manifestPaths: sortedManifestPaths,
    manifestLines,
    serviceNameLines,
    iacSignals,
    readmeLines,
  };
}
