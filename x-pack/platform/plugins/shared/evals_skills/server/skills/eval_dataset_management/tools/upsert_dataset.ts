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
  formatExamplesPreview,
  formatMaturity,
  formatTags,
  inlineCode,
  loadDatasetClient,
  otherResult,
  toConfirmationMessage,
  toErrorResult,
  withDatasetLookup,
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

type UpsertParams = z.infer<typeof schema>;

const describeNewDataset = ({ name, description, tags, maturity, examples }: UpsertParams) => ({
  title: 'Create evaluation dataset?',
  message: toConfirmationMessage([
    `No dataset named ${inlineCode(name)} exists in this space, so this creates it.`,
    [
      `- **Description:** ${inlineCode(description)}`,
      `- **Tags:** ${formatTags(tags)}`,
      `- **Maturity:** ${formatMaturity(maturity)}`,
      `- **Examples:** ${examples.length}`,
    ].join('\n'),
    ...formatExamplesPreview(examples),
  ]),
});

const describeChange = (current: string, next: string): string =>
  current === next ? `${next} (unchanged)` : `${current} → ${next}`;

const fallbackConfirmation = ({ name, examples }: UpsertParams) => ({
  title: 'Replace evaluation dataset examples?',
  message: `This writes dataset ${inlineCode(name)} with ${
    examples.length
  } example(s). If a dataset with that name already exists in this space, its example set is replaced and any example missing from this payload is removed.`,
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
    'Create or replace an evaluation dataset by name. When the name already exists, the example set is replaced: any existing example missing from this call is removed, in every space that shares the dataset. The description is overwritten with the one passed. Returns how many examples were added, removed, and unchanged.',
  schema,
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams, context }) => {
      const { title, message } = await withDatasetLookup(
        deps,
        context,
        fallbackConfirmation(toolParams),
        async (client) => {
          const existing = await client.resolveByName(toolParams.name);
          if (!existing) {
            return describeNewDataset(toolParams);
          }

          const { name, description, tags, maturity, examples } = toolParams;
          const otherSpaces = existing.space_ids.filter((id) => id !== context.spaceId).length;

          return {
            title: 'Replace evaluation dataset examples?',
            message: toConfirmationMessage([
              `This replaces the examples of dataset ${inlineCode(
                name
              )} in the current space. It currently has ${
                existing.examples_count
              } example(s); afterwards it holds exactly the ${
                examples.length
              } example(s) in this payload.`,
              [
                `- **Description:** ${describeChange(
                  inlineCode(existing.description),
                  inlineCode(description)
                )}`,
                `- **Tags:** ${
                  tags === undefined
                    ? '_kept as is_'
                    : describeChange(
                        formatTags(existing.tags),
                        formatTags(tags.map((tag) => tag.toLowerCase()))
                      )
                }`,
                `- **Maturity:** ${
                  maturity === undefined
                    ? '_kept as is_'
                    : describeChange(formatMaturity(existing.maturity), formatMaturity(maturity))
                }`,
              ].join('\n'),
              ...(existing.examples_count > 0
                ? ['**Any existing example missing from this payload is removed.**']
                : []),
              ...(otherSpaces > 0
                ? [
                    `**This dataset is shared with ${otherSpaces} other space(s); the change applies there too.**`,
                  ]
                : []),
              ...formatExamplesPreview(examples),
            ]),
          };
        }
      );

      return { title, message, confirm_text: 'Upsert dataset', cancel_text: 'Cancel' };
    },
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
