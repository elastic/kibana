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

/**
 * Lists distinct `file.path`s in a repo whose path matches the given RLIKE
 * pattern. One query per pattern; never throws.
 */
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
  /** Repository-level IaC signals derived from file paths. */
  iacSignals: IacSignal[];
}

/**
 * Deterministically finds candidate service roots in one repository by greping
 * for deploy-marker files (`Dockerfile`, `go.mod`, `.csproj`, ...). Each marker's
 * directory becomes a candidate root; the marker implies the language. Also
 * collects manifest file paths (compose/k8s/helm/...) and repository IaC signals.
 * No LLM. The classifier ({@link classifyServices}) then judges + collapses.
 */
export async function discoverCandidateRoots({
  esClient,
  repo,
  logger,
  perMarkerLimit = 500,
}: DiscoverCandidateRootsOptions): Promise<DiscoverCandidateRootsResult> {
  const { org, repo: repoName, gitSha, repository } = repo;

  // marker basename -> matching file paths
  const rootMarkers = new Map<string, Set<string>>();
  const rootLanguages = new Map<string, Set<string>>();

  for (const { marker, language } of SERVICE_DEPLOY_MARKERS) {
    // Match the basename at the end of the path: `.*<marker>` handles both exact
    // basenames (`go.mod`) and suffix markers (`.csproj`, matched as `[.]csproj`).
    const pattern = `.*${escapeForRlike(marker)}`;
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
    for (const path of paths) {
      // Only accept a path whose basename actually is/ends with the marker (RLIKE
      // `.*<marker>` can match mid-path substrings otherwise).
      const base = path.slice(path.lastIndexOf('/') + 1);
      if (base !== marker && !base.endsWith(marker)) {
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

  const candidates: ServiceCandidateRoot[] = [];
  for (const [serviceRoot, markers] of rootMarkers) {
    const langs = rootLanguages.get(serviceRoot);
    candidates.push({
      repository,
      gitSha,
      serviceRoot,
      markers: [...markers].sort(),
      language: langs && langs.size > 0 ? [...langs].sort()[0] : 'unknown',
    });
  }
  candidates.sort((a, b) => a.serviceRoot.localeCompare(b.serviceRoot));

  // Manifest paths (deploy topology, incl. third-party images with no marker).
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
      paths.forEach((p) => manifestPaths.add(p));
    } catch (error) {
      logger.debug(
        `discover_services: manifest grep failed for "${repository}" pattern ${JSON.stringify(
          pattern
        )}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Repository IaC signals (one example path per kind).
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

  logger.debug(
    `discover_services: "${repository}" -> ${candidates.length} candidate root(s), ` +
      `${manifestPaths.size} manifest file(s), ${iacSignals.length} IaC signal(s)`
  );

  return { candidates, manifestPaths: [...manifestPaths].sort(), iacSignals };
}
