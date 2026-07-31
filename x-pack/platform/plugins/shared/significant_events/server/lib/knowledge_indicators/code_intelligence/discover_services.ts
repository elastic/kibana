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
  IAC_PATH_MARKERS,
  MANIFEST_PATH_PATTERNS,
  SERVICE_DEPLOY_MARKERS,
  SOURCERER_LINES_INDEX,
  SOURCERER_REFS_INDEX,
} from './constants';
import type { IacSignal, IacKind, IndexedRepoRef, ServiceCandidateRoot } from './types';

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

/**
 * Repo-root README path (case-insensitive, common extensions). Only the repo
 * root is matched — a README states what the repository *is*, which helps the
 * classifier judge deployable-service vs library/monorepo. Nested READMEs are
 * intentionally excluded to keep the single classify call cheap.
 */
const README_PATH_PATTERN = '[Rr][Ee][Aa][Dd][Mm][Ee]([.][A-Za-z0-9]+)?';

/** Max README lines (from the top) fed to the classifier per repo. */
const README_LINE_LIMIT = 40;

/**
 * Enumerates the repositories + immutable commits indexed in Sourcerer, from the
 * refs index (`sourcerer-v1-refs*`). Server-side equivalent of the agent's
 * `sourcerer.refs.list`. One entry per indexed ref; only `complete` refs are
 * returned. Never throws — a missing index yields an empty list.
 */
export async function listIndexedRepos({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<IndexedRepoRef[]> {
  try {
    const response = (await esClient.esql.query({
      query: `
        FROM ${SOURCERER_REFS_INDEX}
        | WHERE status == "complete"
        | KEEP git.org, git.repo, git.commit, git.ref
        | SORT git.org, git.repo
        | LIMIT 1000`,
      drop_null_columns: false,
    })) as ESQLSearchResponse;

    const col = (name: string) => response.columns.findIndex((c) => c.name === name);
    const orgCol = col('git.org');
    const repoCol = col('git.repo');
    const commitCol = col('git.commit');
    const refCol = col('git.ref');
    if (orgCol === -1 || repoCol === -1 || commitCol === -1) {
      return [];
    }

    const refs: IndexedRepoRef[] = [];
    for (const row of response.values) {
      const org = String(row[orgCol] ?? '');
      const repo = String(row[repoCol] ?? '');
      const gitSha = String(row[commitCol] ?? '');
      if (!org || !repo || !gitSha) {
        continue;
      }
      refs.push({
        repository: `${org}/${repo}`,
        org,
        repo,
        gitSha,
        ref: refCol === -1 ? undefined : String(row[refCol] ?? '') || undefined,
      });
    }
    return refs;
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

/** Lists distinct paths in a repo that match one RLIKE pattern. */
async function listPaths({
  esClient,
  org,
  repo,
  gitSha,
  pattern,
  limit,
}: {
  esClient: ElasticsearchClient;
  org: string;
  repo: string;
  gitSha: string;
  pattern: string;
  limit: number;
}): Promise<string[]> {
  const response = (await esClient.esql.query({
    query: `
      FROM ${SOURCERER_LINES_INDEX}
      | WHERE MATCH(git.org, ?git_org)
          AND git.repo LIKE ?git_repo
          AND git.commit LIKE ?git_commit
          AND file.path RLIKE ?pattern
      | STATS n = COUNT(*) BY file.path
      | KEEP file.path
      | SORT file.path
      | LIMIT ${limit}`,
    params: [{ git_org: org }, { git_repo: repo }, { git_commit: gitSha }, { pattern }],
    drop_null_columns: false,
  })) as ESQLSearchResponse;

  const pathCol = response.columns.findIndex((c) => c.name === 'file.path');
  if (pathCol === -1) {
    return [];
  }
  return response.values.map((row) => String(row[pathCol] ?? '')).filter(Boolean);
}

interface EvidenceLine {
  filePath: string;
  lineNumber: number;
  content: string;
}

/** Greps line contents, optionally restricted to a known set of file paths. */
async function grepLines({
  esClient,
  org,
  repo,
  gitSha,
  pattern,
  filePaths,
  limit,
}: {
  esClient: ElasticsearchClient;
  org: string;
  repo: string;
  gitSha: string;
  pattern: string;
  filePaths?: string[];
  limit: number;
}): Promise<EvidenceLine[]> {
  const pathParams = (filePaths ?? []).map((path, index) => ({ [`file_path_${index}`]: path }));
  const pathClause = filePaths?.length
    ? `\n          AND file.path IN (${filePaths
        .map((_, index) => `?file_path_${index}`)
        .join(', ')})`
    : '';
  const response = (await esClient.esql.query({
    query: `
      FROM ${SOURCERER_LINES_INDEX}
      | WHERE MATCH(git.org, ?git_org)
          AND git.repo LIKE ?git_repo
          AND git.commit LIKE ?git_commit${pathClause}
          AND line.content RLIKE ?pattern
      | KEEP file.path, line.number, line.content
      | SORT file.path, line.number
      | LIMIT ${limit}`,
    params: [
      { git_org: org },
      { git_repo: repo },
      { git_commit: gitSha },
      ...pathParams,
      { pattern },
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

const formatEvidenceLine = ({ filePath, lineNumber, content }: EvidenceLine): string =>
  `${filePath}:${lineNumber}\t${content}`;

/** Reads the first `limit` lines (ordered) of one file's indexed content. */
async function readFileHead({
  esClient,
  org,
  repo,
  gitSha,
  filePath,
  limit,
}: {
  esClient: ElasticsearchClient;
  org: string;
  repo: string;
  gitSha: string;
  filePath: string;
  limit: number;
}): Promise<string[]> {
  const response = (await esClient.esql.query({
    query: `
      FROM ${SOURCERER_LINES_INDEX}
      | WHERE MATCH(git.org, ?git_org)
          AND git.repo LIKE ?git_repo
          AND git.commit LIKE ?git_commit
          AND file.path == ?file_path
      | KEEP line.number, line.content
      | SORT line.number
      | LIMIT ${limit}`,
    params: [{ git_org: org }, { git_repo: repo }, { git_commit: gitSha }, { file_path: filePath }],
    drop_null_columns: false,
  })) as ESQLSearchResponse;

  const contentCol = response.columns.findIndex((c) => c.name === 'line.content');
  if (contentCol === -1) {
    return [];
  }
  return response.values.map((row) => String(row[contentCol] ?? ''));
}

/** Escapes a literal basename for use inside an RLIKE pattern (dots -> `[.]`). */
const escapeForRlike = (basename: string): string => basename.replace(/\./g, '[.]');

export interface DiscoverCandidateRootsOptions {
  esClient: ElasticsearchClient;
  repo: IndexedRepoRef;
  logger: Logger;
  /** Max matching files per marker pattern (defaults to 500). */
  perMarkerLimit?: number;
}

export interface DiscoverCandidateRootsResult {
  candidates: ServiceCandidateRoot[];
  /** Manifest file paths found in the repo (fed to the classifier as evidence). */
  manifestPaths: string[];
  /** Selected content lines from the matched manifest files. */
  manifestLines: string[];
  /** Lines that declare runtime service names. */
  serviceNameLines: string[];
  /** Repository-level IaC signals derived from file paths. */
  iacSignals: IacSignal[];
  /** First {@link README_LINE_LIMIT} lines of the repo-root README, if present. */
  readmeLines: string[];
}

/**
 * Deterministically finds candidate service roots and supporting classification
 * evidence in one repository. No LLM. The classifier then judges + collapses.
 */
export async function discoverCandidateRoots({
  esClient,
  repo,
  logger,
  perMarkerLimit = 500,
}: DiscoverCandidateRootsOptions): Promise<DiscoverCandidateRootsResult> {
  const { org, repo: repoName, gitSha, repository } = repo;
  const rootMarkers = new Map<string, Set<string>>();
  const rootLanguages = new Map<string, Set<string>>();

  for (const { marker, language, patternOverride, basenameMatches } of SERVICE_DEPLOY_MARKERS) {
    const pattern = patternOverride ?? `.*${escapeForRlike(marker)}`;
    let paths: string[];
    try {
      paths = await listPaths({
        esClient,
        org,
        repo: repoName,
        gitSha,
        pattern,
        limit: perMarkerLimit,
      });
    } catch (error) {
      logger.debug(
        `discover_services: marker grep failed for "${repository}" marker ${JSON.stringify(
          marker
        )}: ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }
    if (paths.length === perMarkerLimit) {
      logger.warn(
        `discover_services: marker grep for "${repository}" pattern ${JSON.stringify(
          pattern
        )} reached limit ${perMarkerLimit}; path-sorted results may be truncated with alphabetical bias`
      );
    }
    for (const path of paths) {
      const base = path.slice(path.lastIndexOf('/') + 1);
      const matches = basenameMatches
        ? basenameMatches(base)
        : base === marker || base.endsWith(marker);
      if (!matches) {
        continue;
      }
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

  const manifestPaths = new Set<string>();
  for (const pattern of MANIFEST_PATH_PATTERNS) {
    try {
      const paths = await listPaths({
        esClient,
        org,
        repo: repoName,
        gitSha,
        pattern,
        limit: perMarkerLimit,
      });
      if (paths.length === perMarkerLimit) {
        logger.warn(
          `discover_services: manifest-path grep for "${repository}" pattern ${JSON.stringify(
            pattern
          )} reached limit ${perMarkerLimit}; path-sorted results may be truncated with alphabetical bias`
        );
      }
      paths.forEach((path) => manifestPaths.add(path));
    } catch (error) {
      logger.debug(
        `discover_services: manifest grep failed for "${repository}" pattern ${JSON.stringify(
          pattern
        )}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const manifestLines: string[] = [];
  const sortedManifestPaths = [...manifestPaths].sort();
  if (sortedManifestPaths.length > 0) {
    for (const pattern of MANIFEST_CONTENT_PATTERNS) {
      try {
        const lines = await grepLines({
          esClient,
          org,
          repo: repoName,
          gitSha,
          pattern,
          filePaths: sortedManifestPaths,
          limit: EVIDENCE_LINE_LIMIT,
        });
        manifestLines.push(...lines.map(formatEvidenceLine));
      } catch (error) {
        logger.debug(
          `discover_services: manifest-content grep failed for "${repository}" pattern ${JSON.stringify(
            pattern
          )}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  const serviceNameLines: string[] = [];
  for (const pattern of SERVICE_NAME_PATTERNS) {
    try {
      const lines = await grepLines({
        esClient,
        org,
        repo: repoName,
        gitSha,
        pattern,
        limit: EVIDENCE_LINE_LIMIT,
      });
      serviceNameLines.push(...lines.map(formatEvidenceLine));
    } catch (error) {
      logger.debug(
        `discover_services: service-name grep failed for "${repository}" pattern ${JSON.stringify(
          pattern
        )}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const entrypointPaths = new Set<string>();
  for (const pattern of ENTRYPOINT_PATTERNS) {
    try {
      const lines = await grepLines({
        esClient,
        org,
        repo: repoName,
        gitSha,
        pattern,
        limit: EVIDENCE_LINE_LIMIT,
      });
      lines.forEach(({ filePath }) => entrypointPaths.add(filePath));
    } catch (error) {
      logger.debug(
        `discover_services: entrypoint grep failed for "${repository}" pattern ${JSON.stringify(
          pattern
        )}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

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

  const iacByKind = new Map<IacKind, string>();
  for (const { pattern, kind } of IAC_PATH_MARKERS) {
    if (iacByKind.has(kind as IacKind)) {
      continue;
    }
    try {
      const paths = await listPaths({ esClient, org, repo: repoName, gitSha, pattern, limit: 1 });
      if (paths.length > 0) {
        iacByKind.set(kind as IacKind, paths[0]);
      }
    } catch {
      // best-effort; skip
    }
  }
  const iacSignals: IacSignal[] = [...iacByKind].map(([kind, path]) => ({ kind, path }));
  const cappedManifestLines = manifestLines.slice(0, EVIDENCE_LINE_LIMIT);
  const cappedServiceNameLines = serviceNameLines.slice(0, EVIDENCE_LINE_LIMIT);

  // Repo-root README: pick the shallowest matching README file (root over any
  // that slipped through), then read its first README_LINE_LIMIT lines in order.
  const readmeLines: string[] = [];
  try {
    const readmePaths = await listPaths({
      esClient,
      org,
      repo: repoName,
      gitSha,
      pattern: README_PATH_PATTERN,
      limit: perMarkerLimit,
    });
    const rootReadme = readmePaths
      .filter((path) => !path.includes('/'))
      .sort((a, b) => a.localeCompare(b))[0];
    if (rootReadme) {
      readmeLines.push(
        ...(await readFileHead({
          esClient,
          org,
          repo: repoName,
          gitSha,
          filePath: rootReadme,
          limit: README_LINE_LIMIT,
        }))
      );
    }
  } catch (error) {
    logger.debug(
      `discover_services: README read failed for "${repository}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  logger.debug(
    `discover_services: "${repository}" -> ${candidates.length} candidate root(s), ` +
      `${manifestPaths.size} manifest file(s), ${iacSignals.length} IaC signal(s)`
  );

  return {
    candidates,
    manifestPaths: sortedManifestPaths,
    manifestLines: cappedManifestLines,
    serviceNameLines: cappedServiceNameLines,
    iacSignals,
    readmeLines,
  };
}
