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
  datasetDescriptionSchema,
  datasetIdSchema,
  datasetNameSchema,
  errorResult,
  evalsDatasetTools,
  isDatasetAlreadyExistsError,
  loadDatasetClient,
  otherResult,
  toErrorResult,
} from './tool_utils';

const schema = z.object({
  dataset_id: datasetIdSchema.describe('Id of the dataset to copy.'),
  name: datasetNameSchema.describe('Name for the new dataset. Must be unused in this space.'),
  description: datasetDescriptionSchema
    .optional()
    .describe('Description for the copy. Defaults to the source dataset description.'),
});

/**
 * Copies a dataset, including its examples, under a new name in the current space.
 */
export const copyDatasetTool = (
  deps: EvalDatasetManagementToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsDatasetTools.copyDataset,
  type: ToolType.builtin,
  description:
    'Copy an evaluation dataset, including its examples, to a new name in the current space.',
  schema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: 'Copy evaluation dataset?',
      message: `This copies dataset "${toolParams.dataset_id}" into a new dataset named "${toolParams.name}" in the current space.`,
      confirm_text: 'Copy dataset',
      cancel_text: 'Cancel',
    }),
  },
  handler: async ({ dataset_id: datasetId, name, description }, { request, spaceId }) => {
    try {
      const loaded = await loadDatasetClient(
        deps,
        { request, spaceId },
        'manage',
        'copy an evaluation dataset'
      );
      if ('error' in loaded) {
        return loaded.error;
      }

      const dataset = await loaded.client.copy(datasetId, { name, description });
      if (!dataset) {
        return errorResult(`Evaluation dataset not found: ${datasetId}`);
      }

      return otherResult({
        dataset_id: dataset.id,
        name: dataset.name,
        examples_count: dataset.examples_count,
      });
    } catch (error) {
      if (isDatasetAlreadyExistsError(error)) {
        return errorResult(`${error.message}. Choose a different name for the copy.`);
      }
      return toErrorResult(error, 'Failed to copy an evaluation dataset');
    }
  },
});
