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
  inlineCode,
  loadDatasetClient,
  otherResult,
  toErrorResult,
  withDatasetLookup,
} from './tool_utils';
import type { DatasetDocument } from './tool_utils';

const schema = z.object({
  dataset_id: datasetIdSchema,
  intent: z
    .enum(['unshare', 'delete'])
    .optional()
    .describe(
      'The outcome to require. "unshare" only detaches the dataset from this space and fails if that would delete it. "delete" destroys the dataset and fails if another space still shares it. Omit to let the dataset\'s spaces decide: detach when shared, delete when this is the last space.'
    ),
});

type DeleteIntent = 'unshare' | 'delete' | undefined;

const fallbackMessage = (datasetId: string, intent: DeleteIntent): string => {
  const dataset = inlineCode(datasetId);
  if (intent === 'delete') {
    return `This permanently deletes dataset ${dataset} and its examples. It is refused if the dataset is still shared with another space.`;
  }
  if (intent === 'unshare') {
    return `This removes dataset ${dataset} from the current space only. It is refused if this is the last space, because that would delete the dataset.`;
  }
  return `This removes dataset ${dataset} from the current space. If other spaces still share it, it is only detached here. If this is the last space, the dataset and its examples are deleted.`;
};

const describeDelete = (
  { name, examples_count: examplesCount, space_ids: spaceIds }: DatasetDocument,
  spaceId: string,
  intent: DeleteIntent
): string => {
  const dataset = inlineCode(name);
  const otherSpaces = spaceIds.filter((id) => id !== spaceId).length;
  const permanentDelete = `This **permanently deletes** dataset ${dataset} and its ${examplesCount} example(s).`;
  const detach = `This removes dataset ${dataset} from the current space only. It stays available, with its ${examplesCount} example(s), in ${otherSpaces} other space(s).`;

  if (intent === 'delete') {
    return otherSpaces > 0
      ? `This will be refused: dataset ${dataset} is still shared with ${otherSpaces} other space(s), so deleting it here would only remove it from this one.`
      : permanentDelete;
  }
  if (intent === 'unshare') {
    return otherSpaces === 0
      ? `This will be refused: this is the last space holding dataset ${dataset}, so removing it here would delete it.`
      : detach;
  }
  return otherSpaces > 0 ? detach : permanentDelete;
};

/**
 * Removes a dataset from the current space, deleting it only when this space
 * is the last one that holds it (unless the caller states an intent).
 */
export const deleteDatasetTool = (
  deps: EvalDatasetManagementToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsDatasetTools.deleteDataset,
  type: ToolType.builtin,
  description:
    'Remove an evaluation dataset from the current space. A dataset shared with other spaces is only detached here; it is deleted with its examples when this is the last space. Pass intent "delete" or "unshare" to require one of those outcomes.',
  schema,
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams: { dataset_id: datasetId, intent }, context }) => ({
      title: 'Delete evaluation dataset?',
      message: await withDatasetLookup(
        deps,
        context,
        fallbackMessage(datasetId, intent),
        async (client) => {
          const dataset = await client.getMetadata(datasetId);
          return dataset
            ? describeDelete(dataset, context.spaceId, intent)
            : `Dataset ${inlineCode(
                datasetId
              )} was not found in this space, so there is nothing to delete.`;
        }
      ),
      confirm_text: 'Delete dataset',
      cancel_text: 'Cancel',
    }),
  },
  handler: async ({ dataset_id: datasetId, intent }, { request, spaceId }) => {
    try {
      const loaded = await loadDatasetClient(
        deps,
        { request, spaceId },
        'manage',
        'delete an evaluation dataset'
      );
      if ('error' in loaded) {
        return loaded.error;
      }

      const result = await loaded.client.delete(datasetId, { intent });
      if (result === 'not_found') {
        return errorResult(`Evaluation dataset not found: ${datasetId}`);
      }
      if (result === 'intent_mismatch') {
        return errorResult(
          intent === 'unshare'
            ? 'This dataset is no longer shared with any other space, so removing it from this one would delete it.'
            : 'This dataset is now shared with another space, so deleting it here would only remove it from this one.'
        );
      }

      return otherResult({
        dataset_id: datasetId,
        deleted: result === 'deleted',
        unshared: result === 'unshared',
      });
    } catch (error) {
      return toErrorResult(error, 'Failed to delete an evaluation dataset');
    }
  },
});
