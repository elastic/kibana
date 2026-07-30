/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { InferenceClient } from '@kbn/inference-common';
import {
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
} from '@kbn/significant-events-schema';
import type { DiscoveredService, IacSignal, ServiceCandidateRoot } from './types';

/**
 * Stage 4: judge the deterministically-grepped candidate service roots with a
 * single batched LLM call, and collapse environment/region duplicates into
 * logical services. Marker grep is exhaustive on candidate roots but cannot tell
 * a deployable service from a shared lib / workspace root / tooling / test dir,
 * and cannot know that `acme-certificates-{production,staging,qa}` are one
 * logical service in three environments. The classifier does both.
 *
 * GROUPING RULE (KI-aligned): a logical service's identity is
 * (logical-name x provider/marker-set); collapse (environment x region). Env
 * duplicates run the same code -> same log signatures -> same KIs, so they are
 * one service with env multiplicity. Different providers/clouds (aws vs gcp vs
 * azure) are different resource graphs -> different signals -> different services.
 *
 * Bounded, tool-less, temperature 0: the cheapest inference tier handles it.
 * Connector = the KI-extraction inference feature's mapping (swappable).
 */

const CLASSIFY_SYSTEM = `You are given candidate directories from source repositories, each with the build/deploy marker files found in it (and, per repository, the deployment-manifest files and IaC signals present). Decide which candidates are INDEPENDENTLY DEPLOYABLE, OBSERVABLE SERVICES and group them into LOGICAL services.

A logical service:
- has its own entrypoint / build target / container / deployment manifest and runs as a process that emits logs or telemetry.
- is NOT: shared libraries, workspace/monorepo roots that only aggregate others, dev tooling, generated code, tests, examples, or documentation sites.

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
  /** Per-repository manifest file paths, keyed by `"org/repo"`. */
  manifestPathsByRepo: Map<string, string[]>;
  /** Per-repository IaC signals, keyed by `"org/repo"`. */
  iacSignalsByRepo: Map<string, IacSignal[]>;
  logger: Logger;
  abortSignal?: AbortSignal;
}

/** Looks up a representative candidate root for a returned service (by root, then name). */
const findCandidate = (
  candidates: ServiceCandidateRoot[],
  service: { repository: string; serviceRoot: string; name: string }
): ServiceCandidateRoot | undefined =>
  candidates.find(
    (c) => c.repository === service.repository && c.serviceRoot === service.serviceRoot
  ) ??
  candidates.find(
    (c) => c.repository === service.repository && c.serviceRoot.endsWith(`/${service.name}`)
  ) ??
  candidates.find((c) => c.repository === service.repository);

/**
 * Classifies + collapses candidate roots into logical {@link DiscoveredService}s.
 * On inference failure, degrades gracefully: every candidate root becomes a
 * service (no collapse, dir-name as name) so discovery still yields the extraction
 * fan-out something to work on.
 */
export async function classifyServices({
  inferenceClient,
  connectorId,
  candidates,
  manifestPathsByRepo,
  iacSignalsByRepo,
  logger,
  abortSignal,
}: ClassifyServicesOptions): Promise<DiscoveredService[]> {
  if (candidates.length === 0) {
    return [];
  }

  const gitShaByRepo = new Map<string, string>();
  candidates.forEach((c) => gitShaByRepo.set(c.repository, c.gitSha));

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
    candidates.map((c) =>
      toService(
        c.repository,
        c.serviceRoot,
        c.serviceRoot.split('/').pop() || c.serviceRoot,
        c.language
      )
    );

  // Build the evidence payload: one line per candidate root, plus a per-repo
  // header listing the manifest files + IaC signals (the deploy topology).
  const lines: string[] = [];
  const byRepo = new Map<string, ServiceCandidateRoot[]>();
  for (const c of candidates) {
    const list = byRepo.get(c.repository) ?? [];
    list.push(c);
    byRepo.set(c.repository, list);
  }
  for (const [repository, roots] of byRepo) {
    const manifests = manifestPathsByRepo.get(repository) ?? [];
    const iac = (iacSignalsByRepo.get(repository) ?? []).map((s) => s.kind);
    lines.push(
      `# repository ${repository} | manifests: ${
        manifests.length ? manifests.join(', ') : 'none'
      } | iac: ${iac.length ? iac.join(', ') : 'none'}`
    );
    for (const c of roots) {
      lines.push(`${c.serviceRoot}\tmarkers=${c.markers.join(',')}\tlang=${c.language}`);
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
          pluginId: SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
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
    if (!name || !repository || !serviceRoot || !gitShaByRepo.has(repository)) {
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

  // Note: an empty `discovered` here means the classifier ran but judged nothing
  // a service (or returned only unmatched rows) — that is a valid answer, not a
  // failure, so we do NOT fall back to candidate roots. `degrade()` is reserved
  // for inference errors (above), where we have no judgement at all.
  logger.debug(
    `classify_services: ${candidates.length} candidate root(s) -> ${discovered.length} logical service(s)`
  );
  return discovered;
}
