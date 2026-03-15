/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDuplicateFeature } from '@kbn/streams-schema';
import { identifyFeatures, type DeletedFeatureSummary } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { sampleSize as lodashSampleSize } from 'lodash';
import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { MANAGED_STREAM_NAME } from '../datasets';
import type { SoftDeleteTaskOutput } from '../../../src/evaluators/soft_delete';
import { fetchSampleDocuments } from './fetch_sample_documents';

export async function runSoftDeleteExperiment({
  esClient,
  deleteCount,
  followUpRuns,
  inferenceClient,
  logger,
  sampleSize,
  log,
}: {
  esClient: Client;
  deleteCount: number;
  followUpRuns: number;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  sampleSize: number;
  log: ToolingLog;
}): Promise<SoftDeleteTaskOutput> {
  const abortController = new AbortController();

  const initialSampleDocuments = await fetchSampleDocuments({
    esClient,
    sampleSize,
    log,
  });

  const { features: initialFeatures } = await identifyFeatures({
    streamName: MANAGED_STREAM_NAME,
    sampleDocuments: initialSampleDocuments,
    systemPrompt: featuresPrompt,
    inferenceClient,
    logger,
    signal: abortController.signal,
  });

  log.info(`Initial identification returned ${initialFeatures.length} features`);

  if (initialFeatures.length < deleteCount) {
    log.info(
      `Not enough features identified (${initialFeatures.length}) to delete ${deleteCount}, skipping follow-up runs`
    );
    return {
      initialFeatures,
      deletedFeatures: [],
      followUpRuns: [],
    };
  }

  const featuresToDelete = lodashSampleSize(initialFeatures, deleteCount);
  const deletedFeatures: DeletedFeatureSummary[] = featuresToDelete.map(
    ({ id, type, subtype, title, description, properties }) => ({
      id,
      type,
      subtype,
      title,
      description,
      properties,
    })
  );

  const outputs: SoftDeleteTaskOutput['followUpRuns'] = [];

  for (let i = 0; i < followUpRuns; i++) {
    const sampleDocuments = await fetchSampleDocuments({
      esClient,
      sampleSize,
      log,
    });

    const { features: rawFeatures, ignoredFeatures } = await identifyFeatures({
      streamName: MANAGED_STREAM_NAME,
      sampleDocuments,
      deletedFeatures,
      systemPrompt: featuresPrompt,
      inferenceClient,
      logger,
      signal: abortController.signal,
    });

    const features = rawFeatures.filter(
      (feature) => !deletedFeatures.some((deleted) => isDuplicateFeature(feature, deleted))
    );

    outputs.push({ features, rawFeatures, ignoredFeatures });
  }

  return {
    initialFeatures,
    deletedFeatures,
    followUpRuns: outputs,
  };
}
