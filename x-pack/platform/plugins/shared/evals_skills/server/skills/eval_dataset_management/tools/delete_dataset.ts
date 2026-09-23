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
  otherResult,
  toErrorResult,
} from './tool_utils';

const schema = z.object({
  dataset_id: datasetIdSchema,
  intent: z
    .enum(['unshare', 'delete'])
    .optional()
    .describe(
      'The outcome to require. "unshare" only detaches the dataset from this space and fails if that would delete it. "delete" destroys the dataset and fails if another space still shares it. Omit to let the dataset\'s spaces decide: detach when shared, delete when this is the last space.'
    ),
});

const confirmationMessage = (
  datasetId: string,
  intent: 'unshare' | 'delete' | undefined
): string => {
  if (intent === 'delete') {
    return `This permanently deletes dataset "${datasetId}" and its examples. It is refused if the dataset is still shared with another space.`;
  }
  if (intent === 'unshare') {
    return `This removes dataset "${datasetId}" from the current space only. It is refused if this is the last space, because that would delete the dataset.`;
  }
  return `This removes dataset "${datasetId}" from the current space. If other spaces still share it, it is only detached here. If this is the last space, the dataset and its examples are deleted.`;
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
    getConfirmation: ({ toolParams }) => ({
      title: 'Delete evaluation dataset?',
      message: confirmationMessage(toolParams.dataset_id, toolParams.intent),
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
