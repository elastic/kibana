/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import { type Streams, DATASET_ANALYSIS_FEATURE_TYPE, type BaseFeature } from '@kbn/streams-schema';

export interface GenerateDatasetAnalysisFeatureOptions {
  stream: Streams.all.Definition;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
}

/**
 * Generates a computed feature containing the dataset analysis for a stream.
 * This feature has a fixed name and empty value to ensure it always gets the same ID,
 * which means new analyses will replace previous ones.
 */
export async function generateDatasetAnalysisFeature({
  stream,
  start,
  end,
  esClient,
}: GenerateDatasetAnalysisFeatureOptions): Promise<BaseFeature> {
  const analysis = await describeDataset({
    esClient,
    index: stream.name,
    start,
    end,
  });

  const formattedAnalysis = formatDocumentAnalysis(analysis, { dropEmpty: true });

  return {
    confidence: 100,
    type: DATASET_ANALYSIS_FEATURE_TYPE,
    description: 'Dataset schema and field analysis including value distributions and coverage',
    properties: {},
    meta: {
      analysis: formattedAnalysis,
    },
    tags: [],
    evidence: [],
    id: DATASET_ANALYSIS_FEATURE_TYPE,
  };
}
