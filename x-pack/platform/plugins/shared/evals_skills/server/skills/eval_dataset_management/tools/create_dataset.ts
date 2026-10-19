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
  datasetAlreadyExistsResult,
  datasetDescriptionSchema,
  datasetExamplesSchema,
  datasetMaturitySchema,
  datasetNameSchema,
  datasetTagsSchema,
  evalsDatasetTools,
  formatExamplesPreview,
  formatMaturity,
  formatTags,
  inlineCode,
  isDatasetAlreadyExistsError,
  loadDatasetClient,
  otherResult,
  toConfirmationMessage,
  toErrorResult,
} from './tool_utils';

const schema = z.object({
  name: datasetNameSchema,
  description: datasetDescriptionSchema,
  tags: datasetTagsSchema.optional(),
  maturity: datasetMaturitySchema.optional(),
  examples: datasetExamplesSchema
    .optional()
    .describe('Examples to create the dataset with. Omit to create an empty dataset.'),
});

/**
 * Creates a dataset in the current space. A taken name is reported back so the
 * agent can switch to upsert instead of guessing.
 */
export const createDatasetTool = (
  deps: EvalDatasetManagementToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsDatasetTools.createDataset,
  type: ToolType.builtin,
  description: `Create an evaluation dataset in the current space. Fails when the name already exists; use ${evalsDatasetTools.editExamples} or ${evalsDatasetTools.upsertDataset} to change the examples of an existing dataset.`,
  schema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams: { name, description, tags, maturity, examples = [] } }) => ({
      title: 'Create evaluation dataset?',
      message: toConfirmationMessage([
        'This creates a dataset in the current space.',
        [
          `- **Name:** ${inlineCode(name)}`,
          `- **Description:** ${inlineCode(description)}`,
          `- **Tags:** ${formatTags(tags)}`,
          `- **Maturity:** ${formatMaturity(maturity)}`,
          `- **Examples:** ${examples.length}`,
        ].join('\n'),
        ...formatExamplesPreview(examples),
      ]),
      confirm_text: 'Create dataset',
      cancel_text: 'Cancel',
    }),
  },
  handler: async ({ name, description, tags, maturity, examples }, { request, spaceId }) => {
    try {
      const loaded = await loadDatasetClient(
        deps,
        { request, spaceId },
        'manage',
        'create an evaluation dataset'
      );
      if ('error' in loaded) {
        return loaded.error;
      }

      const dataset = await loaded.client.create({ name, description, tags, maturity, examples });
      return otherResult({
        dataset_id: dataset.id,
        name: dataset.name,
        examples_count: dataset.examples_count,
      });
    } catch (error) {
      if (isDatasetAlreadyExistsError(error)) {
        return datasetAlreadyExistsResult(error);
      }
      return toErrorResult(error, 'Failed to create an evaluation dataset');
    }
  },
});
