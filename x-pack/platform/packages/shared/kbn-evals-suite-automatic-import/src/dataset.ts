/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset, Example } from '@kbn/evals';
import { loadDatasets } from '../datasets';
import type {
  AutomaticImportDataset,
  AutomaticImportExampleExpected,
  AutomaticImportExampleInput,
  AutomaticImportExampleMetadata,
} from './types';

export type AutomaticImportExample = Example<
  AutomaticImportExampleInput,
  AutomaticImportExampleExpected,
  AutomaticImportExampleMetadata
>;

/** Comma-separated dataset IDs, such as `vendor_a_signon,vendor_k_app`, to run a subset. */
const selectDatasets = (
  datasets: AutomaticImportDataset[],
  selection: string | undefined = process.env.AUTOMATIC_IMPORT_DATASETS
): AutomaticImportDataset[] => {
  if (!selection) {
    return datasets;
  }
  const ids = selection.split(',').map((id) => id.trim());
  const unknown = ids.filter((id) => !datasets.some((dataset) => dataset.id === id));
  if (unknown.length > 0) {
    throw new Error(`Unknown AUTOMATIC_IMPORT_DATASETS: ${unknown.join(', ')}`);
  }
  return datasets.filter(({ id }) => ids.includes(id));
};

/** One example per data stream. */
export const buildEvaluationDataset = (): EvaluationDataset<AutomaticImportExample> => ({
  name: 'automatic-import',
  description: 'Automatic Import ECS mapping accuracy on vendor log samples.',
  examples: selectDatasets(loadDatasets()).map(
    ({ id, title, description, cohort, format, samples }): AutomaticImportExample => ({
      input: {
        datasetId: id,
        title,
        description,
        lines: samples.map(({ line }) => line),
      },
      output: {
        samples: samples.map(({ expected, unscoredFields }) => ({ expected, unscoredFields })),
      },
      metadata: { cohort, format },
    })
  ),
});
