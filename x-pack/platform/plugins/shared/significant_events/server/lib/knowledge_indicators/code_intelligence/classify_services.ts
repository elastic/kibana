/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { InferenceClient } from '@kbn/inference-common';
import {
  SIGNIFICANT_EVENTS_CODE_INTELLIGENCE_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
} from '@kbn/significant-events-schema';
import { IAC_LANGUAGES } from './constants';
import type {
  DiscoveredService,
  IacSignal,
  IndexedRepoRef,
  LanguageCount,
  OtelDetection,
  ServiceCandidateRoot,
} from './types';

/**
 * Whether a candidate-root marker language denotes application (programming)
 * code, as opposed to Infrastructure-as-Code or an unknown/empty marker. Used to
 * decide whether a repository contains application code worth representing as a
 * service even when the classifier returned none for it.
 */
const isApplicationLanguage = (language: string): boolean => {
  const normalized = language.trim().toLowerCase();
  return normalized.length > 0 && normalized !== 'unknown' && !IAC_LANGUAGES.has(normalized);
};

const CLASSIFY_SYSTEM = `You are given candidate directories from source repositories, each with the build/deploy marker files found in it and whether an entrypoint was found. You also receive deployment-manifest paths, selected manifest/service-name declaration lines, and the first lines of each repository's root README. Decide which candidates are INDEPENDENTLY DEPLOYABLE, OBSERVABLE SERVICES and group them into LOGICAL services.

Use the README as context for what the repository IS: it often states plainly whether the repo is a deployable application/service, a shared library, or a monorepo of many services. Prefer README evidence when it clarifies an ambiguous candidate, but never invent a service the markers/manifests do not support.

A logical service:
- has its own entrypoint / build target / container / deployment manifest and runs as a process that emits logs or telemetry.
- is NOT: shared libraries, workspace/monorepo roots that only aggregate others, dev tooling, generated code, tests, examples, or documentation sites.
- candidates with entrypoint=yes are strong service signals; entrypoint=no suggests a library, but manifest evidence can override this.
- manifest-declared runtime services (for example image: entries for kafka, redis, or collectors) MAY be returned even without a candidate root. Set serviceRoot to the manifest file's directory.
- when code or manifests DECLARED a service name (OTEL_SERVICE_NAME, OTEL_RESOURCE_ATTRIBUTES, spring.application.name), prefer the DECLARED name over the directory name.

GROUPING RULE (critical): collapse environment and region duplicates into ONE logical service. e.g. "acme-certificates-production", "acme-certificates-staging" and "acme-certificates-qa" are ONE service named "acme-certificates" seen in 3 environments. Strip environment/region/cloud-instance suffixes (production, staging, qa, dev, govcloud, us-east-1, eu-west-1, etc.) from the name. BUT keep DIFFERENT cloud providers as SEPARATE services when they are genuinely different resource graphs (e.g. an "aws" deployment and a "gcp" deployment of the same platform emit different logs/failures — keep them separate, name them distinctly).

For each logical service return: name (the collapsed service.name), serviceRoot (the repository-relative root of a representative instance), language (use the provided marker-implied language; refine only if clearly wrong), and repository (as given). Skip candidates that are not services.`;

const classifySchema = {
  type: 'object',
  properties: {
    services: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Collapsed logical service name.' },
          repository: { type: 'string', description: 'The "org/repo" this service belongs to.' },
          serviceRoot: {
            type: 'string',
            description: 'Repository-relative root of a representative instance.',
          },
          language: { type: 'string', description: 'Primary language.' },
        },
        required: ['name', 'repository', 'serviceRoot'],
      },
    },
  },
  required: ['services'],
} as const;

export interface ClassifyServicesOptions {
  inferenceClient: InferenceClient;
  connectorId: string;
  candidates: ServiceCandidateRoot[];
  /** Enumerated indexed repos, including repos with no deploy-marker candidates. */
  repos: IndexedRepoRef[];
  /** Per-repository manifest file paths, keyed by `"org/repo"`. */
  manifestPathsByRepo: Map<string, string[]>;
  /** Per-repository selected manifest content lines. */
  manifestLinesByRepo: Map<string, string[]>;
  /** Per-repository service-name declaration lines. */
  serviceNameLinesByRepo: Map<string, string[]>;
  /** Per-repository IaC signals, keyed by `"org/repo"`. */
  iacSignalsByRepo: Map<string, IacSignal[]>;
  /** Per-repository first lines of the repo-root README, keyed by `"org/repo"`. */
  readmeLinesByRepo: Map<string, string[]>;
  /** Per-repository byte-weighted language histogram, keyed by `"org/repo"`. */
  repositoryLanguagesByRepo: Map<string, LanguageCount[]>;
  /** Per-service-root deterministic OTel detections, keyed by `repository::root`. */
  otelDetectionByRoot: Map<string, OtelDetection>;
  logger: Logger;
  abortSignal?: AbortSignal;
}

/** Looks up a candidate root for a returned service by exact root, then name. */
const findCandidate = (
  candidates: ServiceCandidateRoot[],
  service: { repository: string; serviceRoot: string; name: string }
): ServiceCandidateRoot | undefined =>
  candidates.find(
    (candidate) =>
      candidate.repository === service.repository && candidate.serviceRoot === service.serviceRoot
  ) ??
  candidates.find(
    (candidate) =>
      candidate.repository === service.repository &&
      candidate.serviceRoot.endsWith(`/${service.name}`)
  );

/**
 * Classifies + collapses candidate roots into logical {@link DiscoveredService}s.
 * On inference failure, only candidate roots degrade to services; manifest-only
 * services are not synthesized.
 */
export async function classifyServices({
  inferenceClient,
  connectorId,
  candidates,
  repos,
  manifestPathsByRepo,
  manifestLinesByRepo,
  serviceNameLinesByRepo,
  iacSignalsByRepo,
  readmeLinesByRepo,
  repositoryLanguagesByRepo,
  otelDetectionByRoot,
  logger,
  abortSignal,
}: ClassifyServicesOptions): Promise<DiscoveredService[]> {
  const hasManifestLines = [...manifestLinesByRepo.values()].some((lines) => lines.length > 0);
  if (candidates.length === 0 && !hasManifestLines) {
    return [];
  }

  const gitShaByRepo = new Map(repos.map((repo) => [repo.repository, repo.gitSha]));
  const toService = (
    repository: string,
    serviceRoot: string,
    name: string,
    language: string
  ): DiscoveredService => {
    const detection = otelDetectionByRoot.get(`${repository}::${serviceRoot}`) ?? {
      hasOtel: false,
      signalCounts: {
        instrumentation_grpc: 0,
        instrumentation_http: 0,
        instrumentation_other: 0,
        start_span: 0,
        set_attribute: 0,
        add_event: 0,
        record_exception: 0,
        set_status_error: 0,
        create_metric: 0,
      },
    };
    return {
      repository,
      gitSha: gitShaByRepo.get(repository) ?? '',
      serviceRoot,
      name,
      language,
      iacSignals: iacSignalsByRepo.get(repository),
      repositoryLanguages: repositoryLanguagesByRepo.get(repository),
      ...detection,
    };
  };

  const degrade = (): DiscoveredService[] =>
    candidates.map((candidate) =>
      toService(
        candidate.repository,
        candidate.serviceRoot,
        candidate.serviceRoot.split('/').pop() || candidate.serviceRoot,
        candidate.language
      )
    );

  const rootsByRepo = new Map<string, ServiceCandidateRoot[]>();
  for (const candidate of candidates) {
    const roots = rootsByRepo.get(candidate.repository) ?? [];
    roots.push(candidate);
    rootsByRepo.set(candidate.repository, roots);
  }

  const lines: string[] = [];
  for (const repo of repos) {
    const { repository } = repo;
    const roots = rootsByRepo.get(repository) ?? [];
    const manifests = manifestPathsByRepo.get(repository) ?? [];
    const manifestLines = manifestLinesByRepo.get(repository) ?? [];
    const serviceNameLines = serviceNameLinesByRepo.get(repository) ?? [];
    const readmeLines = readmeLinesByRepo.get(repository) ?? [];
    const iac = (iacSignalsByRepo.get(repository) ?? []).map(({ kind }) => kind);
    if (
      roots.length === 0 &&
      manifests.length === 0 &&
      manifestLines.length === 0 &&
      serviceNameLines.length === 0 &&
      readmeLines.length === 0 &&
      iac.length === 0
    ) {
      continue;
    }
    lines.push(
      `# repository ${repository} | manifests: ${
        manifests.length ? manifests.join(', ') : 'none'
      } | iac: ${iac.length ? iac.join(', ') : 'none'}`
    );
    readmeLines.forEach((line) => lines.push(`readme\t${line}`));
    manifestLines.forEach((line) => lines.push(`manifest\t${line}`));
    serviceNameLines.forEach((line) => lines.push(`service-name\t${line}`));
    for (const candidate of roots) {
      lines.push(
        `${candidate.serviceRoot}\tmarkers=${candidate.markers.join(',')}\tlang=${
          candidate.language
        }\tentrypoint=${candidate.hasEntrypoint ? 'yes' : 'no'}`
      );
    }
  }
  const input = `Classify and group these candidate service roots:\n${lines.join('\n')}`;

  let services: Array<{
    name?: string;
    repository?: string;
    serviceRoot?: string;
    language?: string;
  }>;
  try {
    const { output } = await inferenceClient.output({
      id: 'classify_services',
      connectorId,
      system: CLASSIFY_SYSTEM,
      input,
      schema: classifySchema,
      abortSignal,
      metadata: {
        connectorTelemetry: {
          pluginId: SIGNIFICANT_EVENTS_CODE_INTELLIGENCE_INFERENCE_FEATURE_ID,
          aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
        },
      },
    });
    services = output?.services ?? [];
  } catch (error) {
    logger.warn(
      `classify_services: inference failed, falling back to one service per candidate root (${
        error instanceof Error ? error.message : String(error)
      })`
    );
    return degrade();
  }

  const discovered: DiscoveredService[] = [];
  const seen = new Set<string>();
  for (const service of services) {
    const name = service.name?.trim();
    const repository = service.repository?.trim();
    const serviceRoot = service.serviceRoot?.trim();
    if (!name || !repository || serviceRoot === undefined || !gitShaByRepo.has(repository)) {
      continue;
    }
    const key = `${repository}::${name}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const candidate = findCandidate(candidates, { repository, serviceRoot, name });
    const language = service.language?.trim() || candidate?.language || 'unknown';
    discovered.push(toService(repository, candidate?.serviceRoot ?? serviceRoot, name, language));
  }

  // Application-code fallback: guarantee that every repository containing
  // application code is represented by at least one repo-level service, even when
  // the classifier returned none for it (e.g. a monorepo it judged a
  // non-deployable aggregate, like `kibana`). Application code is detected
  // deterministically from the candidate roots discovery already found: an
  // app-language deploy marker or a discovered entrypoint. Repos already carrying
  // a service named after the repo are left as-is (already repo-represented), and
  // pure IaC/docs repos (no app-language marker, no entrypoint) get nothing.
  for (const repo of repos) {
    const { repository } = repo;
    const roots = rootsByRepo.get(repository) ?? [];
    const appRoots = roots.filter(
      (candidate) => isApplicationLanguage(candidate.language) || candidate.hasEntrypoint
    );
    if (appRoots.length === 0) {
      continue;
    }
    const repoName = repository.split('/').pop() || repository;
    const key = `${repository}::${repoName}`;
    if (seen.has(key)) {
      continue;
    }
    // Primary language = most frequent app-language marker among the app roots.
    const languageCounts = new Map<string, number>();
    for (const candidate of appRoots) {
      if (isApplicationLanguage(candidate.language)) {
        languageCounts.set(candidate.language, (languageCounts.get(candidate.language) ?? 0) + 1);
      }
    }
    const [primaryLanguage = 'unknown'] =
      [...languageCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ??
      [];
    seen.add(key);
    discovered.push(toService(repository, '', repoName, primaryLanguage));
    logger.debug(
      `classify_services: repo "${repository}" has application code but no repo-level service; ` +
        `synthesized repo-level service "${repoName}" (${primaryLanguage})`
    );
  }

  logger.debug(
    `classify_services: ${candidates.length} candidate root(s) -> ${discovered.length} logical service(s)`
  );
  return discovered;
}
