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
  datasetNotFoundResult,
  errorResult,
  evalsDatasetTools,
  formatMaturity,
  formatTags,
  inlineCode,
  isDatasetAlreadyExistsError,
  loadDatasetClient,
  otherResult,
  toConfirmationMessage,
  toErrorResult,
  withDatasetLookup,
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
    getConfirmation: async ({
      toolParams: { dataset_id: datasetId, name, description },
      context,
    }) => ({
      title: 'Copy evaluation dataset?',
      message: await withDatasetLookup(
        deps,
        context,
        `This copies dataset ${inlineCode(datasetId)} into a new dataset named ${inlineCode(
          name
        )} in the current space.`,
        async (client) => {
          const source = await client.getMetadata(datasetId);
          if (!source) {
            return `Dataset ${inlineCode(
              datasetId
            )} was not found in this space, so there is nothing to copy.`;
          }

          return toConfirmationMessage([
            `This copies dataset ${inlineCode(source.name)} and its ${
              source.examples_count
            } example(s) into a new dataset in the current space.`,
            [
              `- **New name:** ${inlineCode(name)}`,
              `- **Description:** ${inlineCode(description ?? source.description)}${
                description === undefined ? ' (from the source)' : ''
              }`,
              `- **Tags:** ${formatTags(source.tags)} (from the source)`,
              `- **Maturity:** ${formatMaturity(source.maturity)} (from the source)`,
            ].join('\n'),
          ]);
        }
      ),
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
        return datasetNotFoundResult(datasetId);
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
