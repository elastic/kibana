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
import type { KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import {
  CODE_FEATURE_SUBTYPE_LANGUAGE,
  CODE_FEATURE_SUBTYPE_REPO_TYPE,
  CODE_FEATURE_SUBTYPE_SERVICE_NAME,
} from './constants';
import { classifyRepository } from './classify_repository';
import { buildCodeChangeMeta, isUnchanged, readCodeChangeState } from './code_change_state';
import { reconcileCodeFeatures } from './reconcile_code_features';
import { resolveServiceName, resolveServiceNames } from './resolve_service_name';
import type {
  CodeEvidenceCitation,
  CodeRepositoryReader,
  RepoClassification,
  ServiceNameResolution,
} from './types';

/** Confidence for a service identified purely from its source directory. */
const DIRECTORY_SERVICE_CONFIDENCE = 55;

export type IdentifyCodeFeaturesStatus = 'updated' | 'noop' | 'no_repo';

export interface IdentifyCodeFeaturesResult {
  status: IdentifyCodeFeaturesStatus;
  repository?: string;
  features?: FeatureUpsert[];
}

export interface IdentifyCodeFeaturesOptions {
  streamName: string;
  /** Log index/pattern used to enumerate observed `service.name` values. */
  samplingIndex: string;
  kiClient: KnowledgeIndicatorClient;
  reader: CodeRepositoryReader;
  logger: Logger;
  runId: string;
}

/**
 * Stage 1 (code-driven): derive `repo_type`, `language`, and `service_name`
 * Feature KIs for a stream from its SCS-indexed repository, tagged with code
 * evidence, and reconcile them with existing features. No-ops when the
 * repository is unchanged since the last run.
 */
export async function identifyCodeFeatures({
  streamName,
  samplingIndex,
  kiClient,
  reader,
  logger,
  runId,
}: IdentifyCodeFeaturesOptions): Promise<IdentifyCodeFeaturesResult> {
  const { hits: existingFeatures } = await kiClient.getFeatures(streamName, {
    type: [CODE_ANALYSIS_FEATURE_TYPE],
    includeExcluded: true,
  });

  const state = readCodeChangeState(existingFeatures);
  const repository = state.repository ?? findRepositoryFromFeatures(existingFeatures);

  if (!repository) {
    logger.debug(`code_features: no repository resolved for stream "${streamName}"; skipping`);
    return { status: 'no_repo' };
  }

  const fingerprint = await reader.getChangeFingerprint(repository);
  if (isUnchanged(state, fingerprint)) {
    logger.debug(
      `code_features: repository "${repository}" unchanged (fingerprint ${fingerprint}); noop`
    );
    return { status: 'noop', repository };
  }

  const [languageHistogram, iacSignals] = await Promise.all([
    reader.getLanguageHistogram(repository),
    reader.detectIacSignals(repository),
  ]);
  const classification = classifyRepository(languageHistogram, iacSignals);
  const observedServiceNames = await reader.getObservedServiceNames(samplingIndex);
  const serviceName = await resolveServiceName({
    repository,
    fingerprint,
    searchCode: (repo, query) => reader.searchCode(repo, query),
    observedServiceNames,
  });

  const incoming = buildCodeFeatures({
    streamName,
    repository,
    fingerprint,
    classification,
    serviceName,
  });

  const reconciled = reconcileCodeFeatures({ incoming, existing: existingFeatures, runId });

  // Code features are persisted as durable KIs (no `expires_at`): they reflect
  // the source code, not a sampling window, so they should not expire and are
  // kept alive by the persistent keep-alive path.
  await kiClient.bulk(
    streamName,
    reconciled.map((feature) => ({ index: { feature } }))
  );

  logger.debug(
    `code_features: persisted ${reconciled.length} code feature(s) for stream "${streamName}" from "${repository}"`
  );

  return { status: 'updated', repository, features: reconciled };
}

export type IdentifyCodeForRepositoryStatus = 'updated' | 'noop' | 'no_service';

/** Per-service outcome within a repository run. */
export interface RepositoryServiceResult {
  /** The stream key (resolved `service.name`) the code features were written to. */
  streamName: string;
  status: 'updated' | 'noop';
  features?: FeatureUpsert[];
}

export interface IdentifyCodeForRepositoryResult {
  status: IdentifyCodeForRepositoryStatus;
  /** One entry per distinct service detected in the repository. */
  services: RepositoryServiceResult[];
}

export interface IdentifyCodeForRepositoryOptions {
  repository: string;
  kiClient: KnowledgeIndicatorClient;
  reader: CodeRepositoryReader;
  logger: Logger;
  runId: string;
}

/**
 * Stage 1 (code-first, repo-driven): derive code Feature KIs for an SCS
 * repository without any logs. A repository may deploy many services (monorepo),
 * so we resolve every distinct `service.name` (predicted from code) and write a
 * set of code features per service, keyed by that service name. This associates
 * each with the runtime identity its logs will eventually carry — enabling
 * reconciliation with log-derived KIs later. Per-service no-op when unchanged.
 */
export async function identifyCodeFeaturesForRepository({
  repository,
  kiClient,
  reader,
  logger,
  runId,
}: IdentifyCodeForRepositoryOptions): Promise<IdentifyCodeForRepositoryResult> {
  const fingerprint = await reader.getChangeFingerprint(repository);
  const [languageHistogram, iacSignals] = await Promise.all([
    reader.getLanguageHistogram(repository),
    reader.detectIacSignals(repository),
  ]);
  const classification = classifyRepository(languageHistogram, iacSignals);

  // Primary enumeration: leverage the installed SCS directory-discovery tool to
  // find the services in a (mono)repo — this is how services are laid out in
  // practice (e.g. `src/<service>`), and it works code-first with no logs.
  const ref = fingerprint ? `${repository}@${fingerprint}` : repository;
  const discoveredServices = await reader.discoverServices(repository);
  const serviceNames: ServiceNameResolution[] =
    discoveredServices.length > 0
      ? discoveredServices.map((value) => ({
          value,
          confidence: DIRECTORY_SERVICE_CONFIDENCE,
          predicted: true,
          evidence: [`code: ${ref} service directory (via scs.discover_directories)`],
        }))
      : // Fallback: derive service identity from env-injection / SDK config in code.
        await resolveServiceNames({
          repository,
          fingerprint,
          searchCode: (repo, query) => reader.searchCode(repo, query),
          observedServiceNames: [],
        });

  if (serviceNames.length === 0) {
    logger.debug(
      `code_features: could not resolve any service name from code for repository "${repository}"; skipping`
    );
    return { status: 'no_service', services: [] };
  }

  const services: RepositoryServiceResult[] = [];

  for (const serviceName of serviceNames) {
    const streamName = serviceName.value;

    const { hits: existingFeatures } = await kiClient.getFeatures(streamName, {
      type: [CODE_ANALYSIS_FEATURE_TYPE],
      includeExcluded: true,
    });

    const state = readCodeChangeState(existingFeatures);
    if (isUnchanged(state, fingerprint)) {
      services.push({ streamName, status: 'noop' });
      continue;
    }

    const incoming = buildCodeFeatures({
      streamName,
      repository,
      fingerprint,
      classification,
      serviceName,
    });

    const reconciled = reconcileCodeFeatures({ incoming, existing: existingFeatures, runId });

    await kiClient.bulk(
      streamName,
      reconciled.map((feature) => ({ index: { feature } }))
    );

    services.push({ streamName, status: 'updated', features: reconciled });
  }

  logger.debug(
    `code_features: repository "${repository}" resolved ${services.length} service(s): ${services
      .map((s) => `${s.streamName}=${s.status}`)
      .join(', ')}`
  );

  const status = services.some((service) => service.status === 'updated') ? 'updated' : 'noop';
  return { status, services };
}

export interface IdentifyCodeForServiceResult extends RepositoryServiceResult {
  status: 'updated' | 'noop';
  /** Repository change fingerprint at this run, for downstream evidence refs. */
  fingerprint?: string;
}

export interface IdentifyCodeForServiceOptions {
  repository: string;
  /** The `service.name` the agent resolved for this deployable service. */
  serviceName: string;
  /** Primary language reported by the agent, if any (overrides the repo-wide guess). */
  language?: string;
  /** Source files the agent cited as evidence for this service, if any. */
  evidence?: CodeEvidenceCitation[];
  kiClient: KnowledgeIndicatorClient;
  reader: CodeRepositoryReader;
  logger: Logger;
  runId: string;
}

/**
 * Stage 1 (code-first, service-driven): derive code Feature KIs for a single
 * service that the `scs.code_researcher` agent identified in a repository. The
 * agent owns service enumeration (it reasons over the repo layout instead of us
 * parsing directory names), so this writes the `repo_type`, `language`, and
 * predicted `service_name` features keyed by the agent-provided `service.name`.
 * No-ops when the repository is unchanged since this service was last written.
 */
export async function identifyCodeFeaturesForService({
  repository,
  serviceName: serviceNameValue,
  language,
  evidence,
  kiClient,
  reader,
  logger,
  runId,
}: IdentifyCodeForServiceOptions): Promise<IdentifyCodeForServiceResult> {
  const streamName = serviceNameValue;

  const fingerprint = await reader.getChangeFingerprint(repository);
  const [languageHistogram, iacSignals] = await Promise.all([
    reader.getLanguageHistogram(repository),
    reader.detectIacSignals(repository),
  ]);
  const classification = classifyRepository(languageHistogram, iacSignals);

  const persisted: FeatureUpsert[] = [];

  // Repository-level features (repo type, and the repo-wide primary language
  // when the agent didn't provide a service-specific one) are keyed by the
  // *repository*, not the service. Every service in a (mono)repo shares the same
  // deterministic UUID, so these collapse to a single KI per repository instead
  // of being duplicated once per service. Skipped when the repository is
  // unchanged since it was last classified.
  const { hits: existingRepoFeatures } = await kiClient.getFeatures(repository, {
    type: [CODE_ANALYSIS_FEATURE_TYPE],
    includeExcluded: true,
  });
  const repoUnchanged = isUnchanged(readCodeChangeState(existingRepoFeatures), fingerprint);
  if (!repoUnchanged) {
    const repoIncoming = buildRepositoryFeatures({
      repository,
      fingerprint,
      classification,
      includePrimaryLanguage: !language,
    });
    const reconciledRepo = reconcileCodeFeatures({
      incoming: repoIncoming,
      existing: existingRepoFeatures,
      runId,
    });
    await kiClient.bulk(
      repository,
      reconciledRepo.map((feature) => ({ index: { feature } }))
    );
    persisted.push(...reconciledRepo);
  }

  // Per-service language: only emitted when the agent resolved a language for
  // this specific service (meaningful in a polyglot monorepo). Keyed by the
  // service so distinct services keep distinct languages. The service identity
  // itself is an `entity`/`service` KI on the ingesting stream (see
  // `linkServiceEntities`), so no `service_name` feature is written here.
  if (language) {
    const { hits: existingServiceFeatures } = await kiClient.getFeatures(streamName, {
      type: [CODE_ANALYSIS_FEATURE_TYPE],
      includeExcluded: true,
    });
    const serviceIncoming = buildServiceLanguageFeature({
      serviceStream: streamName,
      repository,
      fingerprint,
      language,
      citations: evidence,
    });
    const reconciledService = reconcileCodeFeatures({
      incoming: serviceIncoming,
      existing: existingServiceFeatures,
      runId,
    });
    await kiClient.bulk(
      streamName,
      reconciledService.map((feature) => ({ index: { feature } }))
    );
    persisted.push(...reconciledService);
  }

  const status = persisted.length > 0 ? 'updated' : 'noop';
  logger.debug(
    `code_features: persisted ${
      persisted.length
    } code feature(s) for service "${streamName}" from "${repository}" (repo ${
      repoUnchanged ? 'unchanged' : 'updated'
    })`
  );

  return { streamName, status, features: persisted, fingerprint };
}

/** Falls back to the repository stamped on an existing `code_analysis` feature. */
function findRepositoryFromFeatures(features: Feature[]): string | undefined {
  for (const feature of features) {
    const repository = feature.properties?.repository;
    if (typeof repository === 'string' && repository.length > 0) {
      return repository;
    }
  }
  return undefined;
}

/** Human-readable value titles for each repository classification. */
const REPO_TYPE_TITLES: Record<RepoClassification['repoType'], string> = {
  app: 'Application',
  iac: 'Infrastructure as code',
  both: 'Application & infrastructure',
};

/**
 * Evidence for a `repo_type` feature: the language-based classification line
 * plus one citation per detected IaC file signal (Kubernetes/Helm/Compose/…),
 * so a `both`/`iac` classification points at the exact infrastructure files.
 */
const buildRepoTypeEvidence = (classification: RepoClassification, ref: string): string[] => [
  `code: ${ref} classified as ${classification.repoType} from indexed languages`,
  ...classification.iacSignals.map((signal) => `code: ${ref}:${signal.path} (${signal.kind})`),
];

const MAX_SNIPPET_LENGTH = 160;

/**
 * Formats agent-cited source locations into KI evidence lines of the shape
 * `code: <repository>@<fingerprint>:<path>[:<line>][ — <snippet>]`. Returns
 * `undefined` when there are no citations so callers can fall back.
 */
export function formatCitations(
  citations: CodeEvidenceCitation[] | undefined,
  ref: string
): string[] | undefined {
  if (!citations?.length) {
    return undefined;
  }
  const lines = citations
    .filter((citation) => typeof citation.path === 'string' && citation.path.length > 0)
    .map((citation) => {
      const location = citation.line != null ? `${citation.path}:${citation.line}` : citation.path;
      const snippet = citation.snippet?.trim();
      const suffix = snippet ? ` — ${snippet.slice(0, MAX_SNIPPET_LENGTH)}` : '';
      return `code: ${ref}:${location}${suffix}`;
    });
  return lines.length > 0 ? lines : undefined;
}

/**
 * Builds the repository-level code features — `repo_type` (always) and the
 * repo-wide primary `language` (optional) — keyed by the repository so they
 * collapse to a single KI per repository regardless of how many services the
 * repository deploys. Uses classification-derived (histogram) evidence rather
 * than any single service's citations, since these describe the whole repo.
 */
function buildRepositoryFeatures({
  repository,
  fingerprint,
  classification,
  includePrimaryLanguage,
}: {
  repository: string;
  fingerprint: string | undefined;
  classification: RepoClassification;
  includePrimaryLanguage: boolean;
}): FeatureUpsert[] {
  const ref = fingerprint ? `${repository}@${fingerprint}` : repository;
  const features: FeatureUpsert[] = [
    {
      id: CODE_FEATURE_SUBTYPE_REPO_TYPE,
      stream_name: repository,
      type: CODE_ANALYSIS_FEATURE_TYPE,
      subtype: CODE_FEATURE_SUBTYPE_REPO_TYPE,
      title: REPO_TYPE_TITLES[classification.repoType],
      description: `Repository ${repository} classified as ${classification.repoType}.`,
      properties: {
        repository,
        repo_type: classification.repoType,
        languages: classification.languages,
      },
      confidence: 90,
      evidence: buildRepoTypeEvidence(classification, ref),
      meta: buildCodeChangeMeta({ repository, fingerprint }),
    },
  ];

  if (includePrimaryLanguage && classification.primaryLanguage) {
    features.push({
      id: CODE_FEATURE_SUBTYPE_LANGUAGE,
      stream_name: repository,
      type: CODE_ANALYSIS_FEATURE_TYPE,
      subtype: CODE_FEATURE_SUBTYPE_LANGUAGE,
      title: classification.primaryLanguage,
      description: `Primary application language is ${classification.primaryLanguage}.`,
      properties: { repository, language: classification.primaryLanguage },
      confidence: 90,
      evidence: [`code: ${ref} primary language ${classification.primaryLanguage}`],
      meta: buildCodeChangeMeta({ repository, fingerprint }),
    });
  }

  return features;
}

/**
 * Builds a per-service `language` feature keyed by the service stream, used when
 * the agent resolved a language specific to this service (polyglot monorepos).
 */
function buildServiceLanguageFeature({
  serviceStream,
  repository,
  fingerprint,
  language,
  citations,
}: {
  serviceStream: string;
  repository: string;
  fingerprint: string | undefined;
  language: string;
  citations?: CodeEvidenceCitation[];
}): FeatureUpsert[] {
  const ref = fingerprint ? `${repository}@${fingerprint}` : repository;
  const citationEvidence = formatCitations(citations, ref);
  return [
    {
      id: CODE_FEATURE_SUBTYPE_LANGUAGE,
      stream_name: serviceStream,
      type: CODE_ANALYSIS_FEATURE_TYPE,
      subtype: CODE_FEATURE_SUBTYPE_LANGUAGE,
      title: language,
      description: `Primary language is ${language}.`,
      properties: { repository, language },
      confidence: 90,
      evidence: citationEvidence ?? [`code: ${ref} primary language ${language}`],
      meta: buildCodeChangeMeta({ repository, fingerprint }),
    },
  ];
}

function buildCodeFeatures({
  streamName,
  repository,
  fingerprint,
  classification,
  serviceName,
  citations,
  includeServiceFeature = true,
}: {
  streamName: string;
  repository: string;
  fingerprint: string | undefined;
  classification: RepoClassification;
  serviceName: ServiceNameResolution | undefined;
  citations?: CodeEvidenceCitation[];
  /**
   * When false, the `service_name` feature is omitted. The service-driven path
   * represents the service as an `entity`/`service` KI on the ingesting stream
   * (see `linkServiceEntities`) instead of a `code_analysis` feature.
   */
  includeServiceFeature?: boolean;
}): FeatureUpsert[] {
  const ref = fingerprint ? `${repository}@${fingerprint}` : repository;
  const citationEvidence = formatCitations(citations, ref);
  const features: FeatureUpsert[] = [];

  features.push({
    id: CODE_FEATURE_SUBTYPE_REPO_TYPE,
    stream_name: streamName,
    type: CODE_ANALYSIS_FEATURE_TYPE,
    subtype: CODE_FEATURE_SUBTYPE_REPO_TYPE,
    // Title carries the value (like log-derived features), not the field name.
    title: REPO_TYPE_TITLES[classification.repoType],
    description: `Repository ${repository} classified as ${classification.repoType}.`,
    properties: {
      repository,
      repo_type: classification.repoType,
      languages: classification.languages,
    },
    confidence: 90,
    evidence: citationEvidence ?? buildRepoTypeEvidence(classification, ref),
    meta: buildCodeChangeMeta({ repository, fingerprint }),
  });

  if (classification.primaryLanguage) {
    features.push({
      id: CODE_FEATURE_SUBTYPE_LANGUAGE,
      stream_name: streamName,
      type: CODE_ANALYSIS_FEATURE_TYPE,
      subtype: CODE_FEATURE_SUBTYPE_LANGUAGE,
      title: classification.primaryLanguage,
      description: `Primary application language is ${classification.primaryLanguage}.`,
      properties: { repository, language: classification.primaryLanguage },
      confidence: 90,
      evidence: citationEvidence ?? [
        `code: ${ref} primary language ${classification.primaryLanguage}`,
      ],
    });
  }

  if (serviceName && includeServiceFeature) {
    features.push({
      id: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
      stream_name: streamName,
      type: CODE_ANALYSIS_FEATURE_TYPE,
      subtype: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
      title: serviceName.value,
      description: serviceName.predicted
        ? `Predicted service.name "${serviceName.value}" (not yet observed in logs).`
        : `Service.name "${serviceName.value}" verified in logs.`,
      properties: {
        repository,
        service_name: serviceName.value,
        predicted: serviceName.predicted,
      },
      confidence: serviceName.confidence,
      evidence: serviceName.evidence,
    });
  }

  return features;
}
