/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import { DATASET_ANALYSIS_FEATURE_TYPE } from '@kbn/streams-schema';
import type { ComputedFeatureGenerator } from './types';

/**
 * Generates a computed feature containing the dataset analysis for a stream.
 * The framework automatically sets name = type. The ID is generated using
 * only stream + type, so value updates replace the existing feature.
 */
export const datasetAnalysisGenerator: ComputedFeatureGenerator = {
  type: DATASET_ANALYSIS_FEATURE_TYPE,

  llmInstructions: `Contains the full schema, field distributions, and sample values from the log dataset.
Use the \`value.analysis\` field to understand available fields and their value distributions.
This is useful for understanding what fields are available for querying and what values they typically contain.`,

  generate: async ({ stream, start, end, esClient }) => {
    const analysis = await describeDataset({
      esClient,
      index: stream.name,
      start,
      end,
    });

    const formattedAnalysis = formatDocumentAnalysis(analysis, { dropEmpty: true });

    return {
      description: 'Dataset schema and field analysis including value distributions and coverage',
      properties: {
        analysis: formattedAnalysis,
      },
    };
  },
};
