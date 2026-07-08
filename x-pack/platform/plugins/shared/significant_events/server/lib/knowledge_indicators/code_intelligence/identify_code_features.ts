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
import { resolveServiceName } from './resolve_service_name';
import type { CodeRepositoryReader, RepoClassification, ServiceNameResolution } from './types';

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

  const classification = classifyRepository(await reader.getLanguageHistogram(repository));
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

function buildCodeFeatures({
  streamName,
  repository,
  fingerprint,
  classification,
  serviceName,
}: {
  streamName: string;
  repository: string;
  fingerprint: string | undefined;
  classification: RepoClassification;
  serviceName: ServiceNameResolution | undefined;
}): FeatureUpsert[] {
  const ref = fingerprint ? `${repository}@${fingerprint}` : repository;
  const features: FeatureUpsert[] = [];

  features.push({
    id: CODE_FEATURE_SUBTYPE_REPO_TYPE,
    stream_name: streamName,
    type: CODE_ANALYSIS_FEATURE_TYPE,
    subtype: CODE_FEATURE_SUBTYPE_REPO_TYPE,
    title: 'Repository type',
    description: `Repository ${repository} classified as ${classification.repoType}.`,
    properties: {
      repository,
      repo_type: classification.repoType,
      languages: classification.languages,
    },
    confidence: 90,
    evidence: [`code: ${ref} classified as ${classification.repoType} from indexed languages`],
    meta: buildCodeChangeMeta({ repository, fingerprint }),
  });

  if (classification.primaryLanguage) {
    features.push({
      id: CODE_FEATURE_SUBTYPE_LANGUAGE,
      stream_name: streamName,
      type: CODE_ANALYSIS_FEATURE_TYPE,
      subtype: CODE_FEATURE_SUBTYPE_LANGUAGE,
      title: 'Primary language',
      description: `Primary application language is ${classification.primaryLanguage}.`,
      properties: { repository, language: classification.primaryLanguage },
      confidence: 90,
      evidence: [`code: ${ref} primary language ${classification.primaryLanguage}`],
    });
  }

  if (serviceName) {
    features.push({
      id: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
      stream_name: streamName,
      type: CODE_ANALYSIS_FEATURE_TYPE,
      subtype: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
      title: 'Service name',
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
