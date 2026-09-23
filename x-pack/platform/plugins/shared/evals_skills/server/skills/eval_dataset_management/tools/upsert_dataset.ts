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
  datasetExamplesSchema,
  datasetMaturitySchema,
  datasetNameSchema,
  datasetTagsSchema,
  evalsDatasetTools,
  loadDatasetClient,
  otherResult,
  toErrorResult,
} from './tool_utils';

const schema = z.object({
  name: datasetNameSchema,
  description: datasetDescriptionSchema,
  tags: datasetTagsSchema.optional(),
  maturity: datasetMaturitySchema.optional(),
  examples: datasetExamplesSchema.describe(
    'The complete example set. Matched by name: an existing dataset with this name has its examples replaced, and any example missing from this list is removed.'
  ),
});

/**
 * Creates a dataset or replaces its examples, matched by name. Examples absent
 * from the payload are deleted.
 */
export const upsertDatasetTool = (
  deps: EvalDatasetManagementToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsDatasetTools.upsertDataset,
  type: ToolType.builtin,
  description:
    'Create or replace an evaluation dataset by name. When the name already exists, the example set is replaced: any existing example missing from this call is removed. Returns how many examples were added, removed, and unchanged.',
  schema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: 'Replace evaluation dataset examples?',
      message: `This writes dataset "${toolParams.name}" with ${toolParams.examples.length} example(s). If a dataset with that name already exists in this space, its example set is replaced and any example missing from this payload is removed.`,
      confirm_text: 'Upsert dataset',
      cancel_text: 'Cancel',
    }),
  },
  handler: async ({ name, description, tags, maturity, examples }, { request, spaceId }) => {
    try {
      const loaded = await loadDatasetClient(
        deps,
        { request, spaceId },
        'manage',
        'upsert an evaluation dataset'
      );
      if ('error' in loaded) {
        return loaded.error;
      }

      const result = await loaded.client.upsert({ name, description, tags, maturity, examples });
      return otherResult({
        dataset_id: result.dataset_id,
        added: result.added,
        removed: result.removed,
        unchanged: result.unchanged,
      });
    } catch (error) {
      return toErrorResult(error, 'Failed to upsert an evaluation dataset');
    }
  },
});
