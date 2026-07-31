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
import type { DiscoveredService, IacSignal, IndexedRepoRef, ServiceCandidateRoot } from './types';

const CLASSIFY_SYSTEM = `You are given candidate directories from source repositories, each with the build/deploy marker files found in it and whether an entrypoint was found. You also receive deployment-manifest paths and selected manifest/service-name declaration lines. Decide which candidates are INDEPENDENTLY DEPLOYABLE, OBSERVABLE SERVICES and group them into LOGICAL services.

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
  ): DiscoveredService => ({
    repository,
    gitSha: gitShaByRepo.get(repository) ?? '',
    serviceRoot,
    name,
    language,
    iacSignals: iacSignalsByRepo.get(repository),
  });

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
    const iac = (iacSignalsByRepo.get(repository) ?? []).map(({ kind }) => kind);
    if (
      roots.length === 0 &&
      manifests.length === 0 &&
      manifestLines.length === 0 &&
      serviceNameLines.length === 0 &&
      iac.length === 0
    ) {
      continue;
    }
    lines.push(
      `# repository ${repository} | manifests: ${
        manifests.length ? manifests.join(', ') : 'none'
      } | iac: ${iac.length ? iac.join(', ') : 'none'}`
    );
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

  logger.debug(
    `classify_services: ${candidates.length} candidate root(s) -> ${discovered.length} logical service(s)`
  );
  return discovered;
}
