/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { MAX_EXAMPLES_PER_DATASET } from '@kbn/evals-common';
import type { EvalDatasetManagementToolDeps } from './deps';
import {
  datasetIdSchema,
  datasetNotFoundResult,
  evalsDatasetTools,
  loadDatasetClient,
  MAX_RETURNED_DATASET_EXAMPLES,
  otherResult,
  toErrorResult,
} from './tool_utils';

const schema = z.object({
  dataset_id: datasetIdSchema,
  offset: z
    .number()
    .int()
    .min(0)
    .max(MAX_EXAMPLES_PER_DATASET)
    .optional()
    .describe(
      `Index of the first example to return, for paging through large datasets. Defaults to 0.`
    ),
});

/**
 * Reads one dataset, including a bounded page of its examples.
 */
export const getDatasetTool = (
  deps: EvalDatasetManagementToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsDatasetTools.getDataset,
  type: ToolType.builtin,
  description: `Get one evaluation dataset by id, including a page of up to ${MAX_RETURNED_DATASET_EXAMPLES} examples (id, input, output, metadata) starting at offset. When examples_omitted is greater than 0 the page is incomplete: do not pass it to ${evalsDatasetTools.upsertDataset}; use ${evalsDatasetTools.editExamples} instead.`,
  schema,
  handler: async ({ dataset_id: datasetId, offset = 0 }, { request, spaceId }) => {
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

      const [dataset, page] = await Promise.all([
        loaded.client.getMetadata(datasetId),
        loaded.client.getExamplesPage(datasetId, {
          from: offset,
          size: MAX_RETURNED_DATASET_EXAMPLES,
        }),
      ]);
      if (!dataset || !page) {
        return datasetNotFoundResult(datasetId);
      }

      const examples = page.examples.map(({ id, input, output, metadata }) => ({
        id,
        input,
        output,
        metadata,
      }));

      return otherResult({
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        tags: dataset.tags ?? [],
        maturity: dataset.maturity,
        shared_with_other_spaces: dataset.space_ids.some((id) => id !== spaceId),
        examples_count: page.total,
        offset,
        examples_omitted: page.total - examples.length,
        examples,
      });
    } catch (error) {
      return toErrorResult(error, 'Failed to get an evaluation dataset');
    }
  },
});
