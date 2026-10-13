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
  datasetNotFoundResult,
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
});

const countOtherSpaces = ({ space_ids: spaceIds }: DatasetDocument, spaceId: string): number =>
  spaceIds.filter((id) => id !== spaceId).length;

/** Detach while other spaces share the dataset; delete once this is the last one. */
const impliedIntent = (dataset: DatasetDocument, spaceId: string) =>
  countOtherSpaces(dataset, spaceId) > 0 ? ('unshare' as const) : ('delete' as const);

const fallbackMessage = (datasetId: string): string =>
  `This removes dataset ${inlineCode(
    datasetId
  )} from the current space. If other spaces still share it, it is only detached here. If this is the last space, the dataset and its examples are deleted.`;

const describeDelete = (dataset: DatasetDocument, spaceId: string): string => {
  const { name, examples_count: examplesCount } = dataset;
  return impliedIntent(dataset, spaceId) === 'delete'
    ? `This **permanently deletes** dataset ${inlineCode(
        name
      )} and its ${examplesCount} example(s).`
    : `This removes dataset ${inlineCode(
        name
      )} from the current space only. It stays available, with its ${examplesCount} example(s), in ${countOtherSpaces(
        dataset,
        spaceId
      )} other space(s).`;
};

/**
 * Removes a dataset from the current space: detaches it while other spaces
 * share it, deletes it when this is the last space.
 */
export const deleteDatasetTool = (
  deps: EvalDatasetManagementToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsDatasetTools.deleteDataset,
  type: ToolType.builtin,
  description:
    'Remove an evaluation dataset from the current space. A dataset shared with other spaces is only detached here; it is deleted with its examples when this is the last space.',
  schema,
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams: { dataset_id: datasetId }, context }) => ({
      title: 'Delete evaluation dataset?',
      message: await withDatasetLookup(
        deps,
        context,
        fallbackMessage(datasetId),
        async (client) => {
          const dataset = await client.getMetadata(datasetId);
          return dataset
            ? describeDelete(dataset, context.spaceId)
            : `Dataset ${inlineCode(
                datasetId
              )} was not found in this space, so there is nothing to delete.`;
        }
      ),
      confirm_text: 'Delete dataset',
      cancel_text: 'Cancel',
    }),
  },
  handler: async ({ dataset_id: datasetId }, { request, spaceId }) => {
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

      const dataset = await loaded.client.getMetadata(datasetId);
      if (!dataset) {
        return datasetNotFoundResult(datasetId);
      }

      const intent = impliedIntent(dataset, spaceId);
      const result = await loaded.client.delete(datasetId, { intent });
      if (result === 'not_found') {
        return datasetNotFoundResult(datasetId);
      }
      if (result === 'intent_mismatch') {
        return errorResult(
          intent === 'unshare'
            ? 'Nothing was changed: the other spaces stopped sharing this dataset, so removing it here would now delete it permanently. Confirm with the user before trying again.'
            : 'Nothing was changed: another space started sharing this dataset, so it would now only be removed from this space. Confirm with the user before trying again.'
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
