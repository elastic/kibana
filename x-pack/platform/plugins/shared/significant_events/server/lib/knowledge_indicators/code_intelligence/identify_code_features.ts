/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { CODE_ANALYSIS_FEATURE_TYPE, type FeatureUpsert } from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import { CODE_FEATURE_SUBTYPE_LANGUAGE, CODE_FEATURE_SUBTYPE_REPO_TYPE } from './constants';
import { classifyRepository } from './classify_repository';
import { buildCodeChangeMeta, isUnchanged, readCodeChangeState } from './code_change_state';
import { reconcileCodeFeatures } from './reconcile_code_features';
import type { CodeEvidenceCitation, IacSignal, LanguageCount, RepoClassification } from './types';

export interface RepositoryServiceResult {
  streamName: string;
  status: 'updated' | 'noop';
  features?: FeatureUpsert[];
}

export interface IdentifyCodeForServiceResult extends RepositoryServiceResult {
  /** Immutable GitHub commit SHA at this run. */
  fingerprint: string;
}

export interface IdentifyCodeForServiceOptions {
  repository: string;
  /** Immutable GitHub commit SHA used as the repository change fingerprint. */
  gitSha: string;
  /** Repository language weights reported by the GitHub research agent. */
  languageHistogram?: LanguageCount[];
  /** Infrastructure-as-code files reported by the GitHub research agent. */
  iacSignals?: IacSignal[];
  /** The `service.name` the agent resolved for this deployable service. */
  serviceName: string;
  /** Primary language reported by the agent, if any. */
  language?: string;
  /** Source files the agent cited as evidence for this service, if any. */
  evidence?: CodeEvidenceCitation[];
  kiClient: KnowledgeIndicatorClient;
  logger: Logger;
  runId: string;
}

/**
 * Derives repository and service language Feature KIs from the structured,
 * pinned source analysis returned by `github.code_researcher`.
 */
export async function identifyCodeFeaturesForService({
  repository,
  gitSha,
  languageHistogram = [],
  iacSignals = [],
  serviceName,
  language,
  evidence,
  kiClient,
  logger,
  runId,
}: IdentifyCodeForServiceOptions): Promise<IdentifyCodeForServiceResult> {
  const classification = classifyRepository(languageHistogram, iacSignals);
  const persisted: FeatureUpsert[] = [];

  const { hits: existingRepoFeatures } = await kiClient.getFeatures(repository, {
    type: [CODE_ANALYSIS_FEATURE_TYPE],
    includeExcluded: true,
  });
  const repoUnchanged = isUnchanged(readCodeChangeState(existingRepoFeatures), gitSha);
  if (!repoUnchanged) {
    const incoming = buildRepositoryFeatures({
      repository,
      gitSha,
      classification,
      includePrimaryLanguage: !language,
    });
    const reconciled = reconcileCodeFeatures({
      incoming,
      existing: existingRepoFeatures,
      runId,
    });
    await kiClient.bulk(
      repository,
      reconciled.map((feature) => ({ index: { feature } }))
    );
    persisted.push(...reconciled);
  }

  if (language) {
    const { hits: existingServiceFeatures } = await kiClient.getFeatures(serviceName, {
      type: [CODE_ANALYSIS_FEATURE_TYPE],
      includeExcluded: true,
    });
    const incoming = buildServiceLanguageFeature({
      serviceName,
      repository,
      gitSha,
      language,
      citations: evidence,
    });
    const reconciled = reconcileCodeFeatures({
      incoming,
      existing: existingServiceFeatures,
      runId,
    });
    await kiClient.bulk(
      serviceName,
      reconciled.map((feature) => ({ index: { feature } }))
    );
    persisted.push(...reconciled);
  }

  logger.debug(
    `code_features: persisted ${persisted.length} code feature(s) for service "${serviceName}" from "${repository}" at ${gitSha}`
  );

  return {
    streamName: serviceName,
    status: persisted.length > 0 ? 'updated' : 'noop',
    features: persisted,
    fingerprint: gitSha,
  };
}

const REPO_TYPE_TITLES: Record<RepoClassification['repoType'], string> = {
  app: 'Application',
  iac: 'Infrastructure as code',
  both: 'Application & infrastructure',
};

const buildRepoTypeEvidence = (classification: RepoClassification, ref: string): string[] => [
  `code: ${ref} classified as ${classification.repoType} from GitHub source analysis`,
  ...classification.iacSignals.map((signal) => `code: ${ref}:${signal.path} (${signal.kind})`),
];

const MAX_SNIPPET_LENGTH = 160;

/** Formats agent-cited source locations into durable KI evidence lines. */
export function formatCitations(
  citations: CodeEvidenceCitation[] | undefined,
  ref: string
): string[] | undefined {
  const lines = (citations ?? [])
    .filter((citation) => citation.path.length > 0)
    .map((citation) => {
      const location = citation.line != null ? `${citation.path}:${citation.line}` : citation.path;
      const snippet = citation.snippet?.trim();
      return `code: ${ref}:${location}${
        snippet ? ` — ${snippet.slice(0, MAX_SNIPPET_LENGTH)}` : ''
      }`;
    });
  return lines.length > 0 ? lines : undefined;
}

const buildRepositoryFeatures = ({
  repository,
  gitSha,
  classification,
  includePrimaryLanguage,
}: {
  repository: string;
  gitSha: string;
  classification: RepoClassification;
  includePrimaryLanguage: boolean;
}): FeatureUpsert[] => {
  const ref = `${repository}@${gitSha}`;
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
      meta: buildCodeChangeMeta({ repository, fingerprint: gitSha }),
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
      meta: buildCodeChangeMeta({ repository, fingerprint: gitSha }),
    });
  }

  return features;
};

const buildServiceLanguageFeature = ({
  serviceName,
  repository,
  gitSha,
  language,
  citations,
}: {
  serviceName: string;
  repository: string;
  gitSha: string;
  language: string;
  citations?: CodeEvidenceCitation[];
}): FeatureUpsert[] => {
  const ref = `${repository}@${gitSha}`;
  return [
    {
      id: CODE_FEATURE_SUBTYPE_LANGUAGE,
      stream_name: serviceName,
      type: CODE_ANALYSIS_FEATURE_TYPE,
      subtype: CODE_FEATURE_SUBTYPE_LANGUAGE,
      title: language,
      description: `Primary language is ${language}.`,
      properties: { repository, language },
      confidence: 90,
      evidence: formatCitations(citations, ref) ?? [`code: ${ref} primary language ${language}`],
      meta: buildCodeChangeMeta({ repository, fingerprint: gitSha }),
    },
  ];
};
