/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeoutSignal } from '@kbn/std';
import { describeDataset, getMappingConflicts } from '@kbn/ai-tools';
import { DATASET_ANALYSIS_FEATURE_TYPE } from '@kbn/significant-events-schema';
import { formatDatasetAnalysis } from './format_dataset_analysis';
import type { ComputedFeatureGenerator } from './types';

const SAMPLE_SIZE = 1000;

export const datasetAnalysisGenerator: ComputedFeatureGenerator = {
  type: DATASET_ANALYSIS_FEATURE_TYPE,

  description: 'Dataset schema and field analysis including value distributions and coverage',

  llmInstructions: `Describes the populated fields of the log dataset, measured on a random sample of \`properties.analysis.sampled\` out of \`properties.analysis.total\` documents.
\`properties.analysis.fields\` maps each field to its most frequent values with the share of sampled documents holding them; \`(no value)\` is the share without the field and \`... (+N more)\` counts the values not shown. The fields that matter most for queries (message, severity, service, error, outcome, status, duration, dataset) come first whenever they are populated, so one of them missing means it is not populated. A numeric field with many values carries a \`range:\` line (min, p50, p95, max) for baselines. A key listing several fields joined by \` = \` means they hold the same values on every sampled document (for example a text field and its keyword sub-field); pick the one whose type fits the operator. \`one value per <field>\` means the field maps one-to-one onto \`<field>\`, whose entry carries the distribution.
\`properties.analysis.constant_fields\` maps the fields that hold one value on every sampled document to that value; filtering on them matches everything or nothing.
\`properties.analysis.other_fields\` names the remaining populated fields without values: \`name\` is a keyword field, \`name (type)\` any other type, and \`parent.* (N fields)\` stands for N fields under \`parent\`. A field that appears nowhere in the analysis is not populated.
Each field key is \`name (types)\`. When a field is mapped as multiple incompatible types across the dataset's backing indices (an ES|QL union type), its key carries a recommendation: \`name (type1, type2 - recommended: <cast>)\`. A bare reference to such a field fails with an ambiguity error — cast it to the exact recommended type, e.g. \`field::<cast>\` (\`exception.message::keyword == "value"\`). Use the cast only with exact operators (\`==\`, \`IN\`, \`LIKE\`). Never put a cast in the field argument of \`MATCH\`, \`MATCH_PHRASE\` or \`:\`: Elasticsearch rejects it with "not a field from an index mapping". To match a phrase on a union-typed field, use \`field::<recommended cast> LIKE "*a phrase*"\`. \`LIKE\` is case-sensitive, so copy the sample casing or lower both sides with \`TO_LOWER\`, and escape \`*\`, \`?\` and \`\\\` in the phrase. The recommended value is authoritative, do not assume \`keyword\`: it is usually \`keyword\`, but e.g. an aggregate_metric_double/double union recommends \`aggregate_metric_double\`, and casting that to \`keyword\` would be lossy. This applies even when the sample values look single-typed, because the conflicting type may live in an older backing index. When a key instead reads \`name (type1, type2 - ambiguous, no safe cast)\`, Elasticsearch could not resolve the union; no cast works, so do not reference that field at all — pick a different one.`,

  generate: async ({ target, start, end, esClient, logger, signal }) => {
    const samplingSource = target.samplingSource;
    const targetSources = target.sources;

    const deadline = timeoutSignal(15_000);
    try {
      const [analysis, mappingConflicts] = await Promise.all([
        describeDataset({
          esClient,
          index: samplingSource,
          start,
          end,
          sampleSize: SAMPLE_SIZE,
          signal,
        }),
        // Best-effort: a probe failure must not drop the whole analysis.
        getMappingConflicts({
          esClient,
          index: targetSources,
          signal: AbortSignal.any([signal, deadline]),
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

      return { analysis: formatDatasetAnalysis(analysis, { conflicts }) };
    } finally {
      deadline.dispose();
    }
  },
};
