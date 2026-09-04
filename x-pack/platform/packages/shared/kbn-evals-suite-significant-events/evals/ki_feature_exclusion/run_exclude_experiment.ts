/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDuplicateFeature } from '@kbn/significant-events-schema';
import {
  EMPTY_TOKENS,
  featuresPrompt,
  identifyFeatures,
  sumTokens,
  type AnalysisTarget,
  type ExcludedFeatureSummary,
} from '@kbn/nightshift-ai';
import { sortBy } from 'lodash';
import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { MANAGED_STREAM_NAME } from '../../src/datasets';
import type { ExcludeExperimentOutput } from '../../src/evaluators/ki_feature_exclusion/evaluators';
import { fetchSampleDocuments } from './fetch_sample_documents';

export async function runExcludeExperiment({
  esClient,
  excludeCount,
  followUpRuns,
  inferenceClient,
  logger,
  sampleSize,
  log,
}: {
  esClient: Client;
  excludeCount: number;
  followUpRuns: number;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  sampleSize: number;
  log: ToolingLog;
}): Promise<ExcludeExperimentOutput> {
  const abortController = new AbortController();

  const sampleDocuments = await fetchSampleDocuments({
    esClient,
    sampleSize,
    log,
  });

  const target: AnalysisTarget = {
    id: MANAGED_STREAM_NAME,
    name: MANAGED_STREAM_NAME,
    sources: [MANAGED_STREAM_NAME, `${MANAGED_STREAM_NAME}.*`],
    samplingSource: MANAGED_STREAM_NAME,
  };

  const { features: initialFeatures, tokensUsed: initialTokens } = await identifyFeatures({
    target,
    sampleDocuments,
    systemPrompt: featuresPrompt,
    inferenceClient,
    logger,
    signal: abortController.signal,
  });

  // The exclusion flow runs identification several times, so provider token
  // counts have to be summed across every run to be comparable with the
  // trace-derived totals, which cover the whole task.
  let tokensUsed = sumTokens({ accumulated: EMPTY_TOKENS, added: initialTokens });

  log.info(`Initial identification returned ${initialFeatures.length} features`);

  if (initialFeatures.length < excludeCount) {
    log.info(
      `Not enough features identified (${initialFeatures.length}) to exclude ${excludeCount}, skipping follow-up runs`
    );
    return {
      initialFeatures,
      excludedFeatures: [],
      followUpRuns: [],
      tokens_used: tokensUsed,
    };
  }

  const featuresToExclude = sortBy(initialFeatures, (f) => f.id).slice(0, excludeCount);
  const excludedFeatures: ExcludedFeatureSummary[] = featuresToExclude.map(
    ({ id, type, subtype, title, description, properties }) => ({
      id,
      type,
      subtype,
      title,
      description,
      properties,
    })
  );

  const outputs: ExcludeExperimentOutput['followUpRuns'] = [];

  for (let i = 0; i < followUpRuns; i++) {
    const {
      features: rawFeatures,
      ignoredFeatures,
      tokensUsed: followUpTokens,
    } = await identifyFeatures({
      target,
      sampleDocuments,
      excludedFeatures,
      systemPrompt: featuresPrompt,
      inferenceClient,
      logger,
      signal: abortController.signal,
    });

    tokensUsed = sumTokens({ accumulated: tokensUsed, added: followUpTokens });

    const features = rawFeatures.filter(
      (feature) =>
        !excludedFeatures.some((excluded) =>
          isDuplicateFeature(feature, {
            ...excluded,
            stream_name: feature.stream_name,
            confidence: 0,
            description: excluded.description ?? '',
          })
        )
    );

    outputs.push({ features, rawFeatures, ignoredFeatures });
  }

  return {
    initialFeatures,
    excludedFeatures,
    followUpRuns: outputs,
    tokens_used: tokensUsed,
  };
}
