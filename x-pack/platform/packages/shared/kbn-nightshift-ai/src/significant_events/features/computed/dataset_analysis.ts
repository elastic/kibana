/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, formatDocumentAnalysis, getMappingConflicts } from '@kbn/ai-tools';
import { DATASET_ANALYSIS_FEATURE_TYPE } from '@kbn/significant-events-schema';
import type { ComputedFeatureGenerator } from './types';

export const datasetAnalysisGenerator: ComputedFeatureGenerator = {
  type: DATASET_ANALYSIS_FEATURE_TYPE,

  description: 'Dataset schema and field analysis including value distributions and coverage',

  llmInstructions: `Contains the schema (excluding empty fields), field distributions, and sample values from the log dataset.
Use the \`properties.analysis\` field to understand available fields and their value distributions.
This is useful for understanding what fields are available for querying and what values they typically contain.
Each field key is \`name (types)\`. When a field is mapped as multiple incompatible types across the dataset's backing indices (an ES|QL union type), its key carries a recommendation: \`name (type1, type2 - recommended: <cast>)\`. A bare reference to such a field fails with an ambiguity error — cast it to the exact recommended type, e.g. \`field::<cast>\` (\`exception.message::keyword == "value"\`). The recommended value is authoritative, do not assume \`keyword\`: it is usually \`keyword\`, but e.g. an aggregate_metric_double/double union recommends \`aggregate_metric_double\`, and casting that to \`keyword\` would be lossy. This applies even when the sample values look single-typed, because the conflicting type may live in an older backing index. When a key instead reads \`name (type1, type2 - ambiguous, no safe cast)\`, Elasticsearch could not resolve the union; no cast works, so do not reference that field at all — pick a different one.`,

  generate: async ({ target, start, end, esClient, logger, signal }) => {
    const samplingSource = target.samplingSource;
    const targetSources = target.sources;

    const [analysis, mappingConflicts] = await Promise.all([
      describeDataset({
        esClient,
        index: samplingSource,
        start,
        end,
        signal,
      }),
      // Best-effort: a probe failure must not drop the whole analysis.
      getMappingConflicts({
        esClient,
        index: targetSources,
        signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
      }).catch((error) => {
        logger.debug(
          () =>
            `Failed to probe mapping conflicts for [${targetSources.join(', ')}]: ${
              error instanceof Error ? error.message : String(error)
            }`
        );
        return [];
      }),
    ]);

    const conflicts = Object.fromEntries(
      mappingConflicts.map(({ field, types, suggestedCast }) => [
        field,
        { types, ...(suggestedCast ? { suggestedCast } : {}) },
      ])
    );

    const formattedAnalysis = formatDocumentAnalysis(analysis, {
      dropEmpty: true,
      dropUnmapped: false,
      limit: 150,
      conflicts,
    });

    return {
      analysis: formattedAnalysis,
    };
  },
};
