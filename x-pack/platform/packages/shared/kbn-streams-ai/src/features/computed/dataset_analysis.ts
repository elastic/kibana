/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, formatDocumentAnalysis, getMappingConflicts } from '@kbn/ai-tools';
import { getStreamSamplingSource } from '@kbn/streams-schema';
import { DATASET_ANALYSIS_FEATURE_TYPE } from '@kbn/significant-events-schema';
import type { ComputedFeatureGenerator } from './types';

export const datasetAnalysisGenerator: ComputedFeatureGenerator = {
  type: DATASET_ANALYSIS_FEATURE_TYPE,

  description: 'Dataset schema and field analysis including value distributions and coverage',

  llmInstructions: `Contains the schema (excluding empty fields), field distributions, and sample values from the log dataset.
Use the \`properties.analysis\` field to understand available fields and their value distributions.
This is useful for understanding what fields are available for querying and what values they typically contain.
\`properties.mapping_conflicts\` lists fields mapped as multiple incompatible types across the dataset's backing indices (ES|QL union types). Referencing such a field bare fails with an ambiguity error, so cast it to its \`suggested_cast\` type before use, e.g. \`field::keyword == "value"\` or \`TO_KEYWORD(field)\`. This applies even when \`properties.analysis\` shows the field with a single type, because the conflict may live in an older backing index.`,

  generate: async ({ stream, start, end, esClient, signal }) => {
    const samplingSource = getStreamSamplingSource(stream);

    const [analysis, mappingConflicts] = await Promise.all([
      describeDataset({
        esClient,
        index: samplingSource,
        start,
        end,
        signal,
      }),
      getMappingConflicts({
        esClient,
        index: samplingSource,
        signal,
      }),
    ]);

    const formattedAnalysis = formatDocumentAnalysis(analysis, {
      dropEmpty: true,
      dropUnmapped: false,
      limit: 150,
    });

    return {
      analysis: formattedAnalysis,
      ...(mappingConflicts.length > 0 ? { mapping_conflicts: mappingConflicts } : {}),
    };
  },
};
