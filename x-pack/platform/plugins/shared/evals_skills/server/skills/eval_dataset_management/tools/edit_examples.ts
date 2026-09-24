/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { MAX_ID_LENGTH } from '@kbn/evals-plugin/common';
import type { EvalDatasetManagementToolDeps } from './deps';
import {
  datasetExamplesSchema,
  datasetIdSchema,
  datasetNotFoundResult,
  errorResult,
  evalsDatasetTools,
  formatExamplesPreview,
  inlineCode,
  isDatasetExamplesLimitExceededError,
  loadDatasetClient,
  otherResult,
  toConfirmationMessage,
  toErrorResult,
  withDatasetLookup,
} from './tool_utils';

const MAX_REMOVED_EXAMPLES = 100;

const schema = z
  .object({
    dataset_id: datasetIdSchema,
    add: datasetExamplesSchema
      .optional()
      .describe(
        'Examples to add. Existing examples are kept; an example identical to one already in the dataset is skipped.'
      ),
    remove_ids: z
      .array(z.string().min(1).max(MAX_ID_LENGTH))
      .max(MAX_REMOVED_EXAMPLES)
      .optional()
      .describe(
        `Ids of examples to remove, as returned by ${evalsDatasetTools.getDataset}. Removed before anything is added.`
      ),
  })
  .refine(({ add, remove_ids: removeIds }) => (add?.length ?? 0) + (removeIds?.length ?? 0) > 0, {
    message: 'Pass at least one example to add or one example id to remove.',
  });

type EditParams = z.infer<typeof schema>;

const describeEdit = ({ add = [], remove_ids: removeIds = [] }: EditParams): string =>
  [
    ...(removeIds.length > 0 ? [`removes ${removeIds.length} example(s)`] : []),
    ...(add.length > 0 ? [`adds ${add.length} example(s)`] : []),
  ].join(' and ');

/**
 * Adds and removes individual examples, leaving the rest of the dataset in place.
 */
export const editExamplesTool = (
  deps: EvalDatasetManagementToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsDatasetTools.editExamples,
  type: ToolType.builtin,
  description: `Add examples to and/or remove examples (by id, up to ${MAX_REMOVED_EXAMPLES}) from an existing evaluation dataset, keeping every other example. Identical added examples are skipped; removed ids not in the dataset are reported as not_found. Use this instead of ${evalsDatasetTools.upsertDataset} for targeted edits, especially on datasets too large to read in full.`,
  schema,
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams, context }) => {
      const { dataset_id: datasetId, add = [] } = toolParams;
      const edit = describeEdit(toolParams);

      return {
        title: 'Edit evaluation dataset examples?',
        message: toConfirmationMessage([
          await withDatasetLookup(
            deps,
            context,
            `This ${edit} in dataset ${inlineCode(datasetId)}.`,
            async (client) => {
              const dataset = await client.getMetadata(datasetId);
              return dataset
                ? `This ${edit} in dataset ${inlineCode(dataset.name)}, which currently has ${
                    dataset.examples_count
                  } example(s). Every other example is kept.`
                : `Dataset ${inlineCode(datasetId)} was not found in this space.`;
            }
          ),
          ...formatExamplesPreview(add),
        ]),
        confirm_text: 'Edit examples',
        cancel_text: 'Cancel',
      };
    },
  },
  handler: async (
    { dataset_id: datasetId, add = [], remove_ids: removeIds = [] },
    { request, spaceId }
  ) => {
    let removed: string[] = [];

    try {
      const loaded = await loadDatasetClient(
        deps,
        { request, spaceId },
        'manage',
        'edit the examples of an evaluation dataset'
      );
      if ('error' in loaded) {
        return loaded.error;
      }

      const removal = await loaded.client.deleteExamples(datasetId, removeIds);
      if (!removal) {
        return datasetNotFoundResult(datasetId);
      }
      removed = removal.deleted;

      const { added, conflicts } = await loaded.client.addExamples(datasetId, add, {
        rejectDuplicates: false,
      });

      return otherResult({
        dataset_id: datasetId,
        removed,
        not_found: removal.notFound,
        added,
        skipped_duplicates: conflicts,
      });
    } catch (error) {
      const progress = { removed, added: 0 };
      if (isDatasetExamplesLimitExceededError(error)) {
        return errorResult(
          `${error.message}. Remove more examples first, or add them to a different dataset.`,
          progress
        );
      }
      return toErrorResult(error, 'Failed to edit the examples of an evaluation dataset', progress);
    }
  },
});
