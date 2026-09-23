/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { EvalDatasetManagementToolDeps } from './deps';
import {
  datasetIdSchema,
  errorResult,
  evalsDatasetTools,
  loadDatasetClient,
  MAX_RETURNED_DATASET_EXAMPLES,
  otherResult,
  toErrorResult,
} from './tool_utils';

const schema = z.object({
  dataset_id: datasetIdSchema,
});

/**
 * Reads one dataset, including a bounded slice of its examples.
 */
export const getDatasetTool = (
  deps: EvalDatasetManagementToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsDatasetTools.getDataset,
  type: ToolType.builtin,
  description: `Get one evaluation dataset by id, including up to ${MAX_RETURNED_DATASET_EXAMPLES} examples (input, output, metadata). When examples_omitted is greater than 0 the list is incomplete — do not pass it to upsert_dataset.`,
  schema,
  handler: async ({ dataset_id: datasetId }, { request, spaceId }) => {
    try {
      const loaded = await loadDatasetClient(
        deps,
        { request, spaceId },
        'read',
        'get an evaluation dataset'
      );
      if ('error' in loaded) {
        return loaded.error;
      }

      const dataset = await loaded.client.get(datasetId);
      if (!dataset) {
        return errorResult(`Evaluation dataset not found: ${datasetId}`);
      }

      const examples = dataset.examples
        .slice(0, MAX_RETURNED_DATASET_EXAMPLES)
        .map(({ id, input, output, metadata }) => ({ id, input, output, metadata }));

      return otherResult({
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        tags: dataset.tags ?? [],
        maturity: dataset.maturity,
        examples_count: dataset.examples_count,
        shared_with_other_spaces: dataset.space_ids.some((id) => id !== spaceId),
        examples,
        examples_omitted: dataset.examples.length - examples.length,
      });
    } catch (error) {
      return toErrorResult(error, 'Failed to get an evaluation dataset');
    }
  },
});
