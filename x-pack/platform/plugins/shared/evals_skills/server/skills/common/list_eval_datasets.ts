/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { DatasetMaturity, MAX_TAG_LENGTH, MAX_TAGS_PER_DATASET } from '@kbn/evals-common';
import { MAX_NAME_LENGTH } from '@kbn/evals-plugin/common';
import type { EvalsSkillsStartDependencies } from '../../types';
import { hasReadEvalsPrivilege } from './check_privileges';
import { errorResult, otherResult, toErrorResult } from './tool_results';

/** Services the shared list-datasets tool needs. Both eval skills satisfy this. */
export interface ListEvalDatasetsToolDeps {
  getStartDependencies: () => Promise<EvalsSkillsStartDependencies>;
}

const schema = z.object({
  search: z
    .string()
    .max(MAX_NAME_LENGTH)
    .optional()
    .describe('Optional case-insensitive substring to filter datasets by name or description.'),
  tags: z
    .array(z.string().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAGS_PER_DATASET)
    .optional()
    .describe(
      'Only return datasets carrying every one of these tags. Tags label what a dataset is about, for example "esql" or "bank-of-anthos".'
    ),
  maturity: z
    .array(DatasetMaturity)
    .optional()
    .describe(
      'Only return datasets at one of these curation levels: "raw", "cleaned" or "golden".'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of datasets to return. Defaults to 50.'),
});

/**
 * Lists evaluation datasets visible in the active space. Each skill passes its
 * own `id`, since inline tool ids must be unique across skills.
 */
export const listEvalDatasetsTool = (
  deps: ListEvalDatasetsToolDeps,
  id: string
): BuiltinSkillBoundedTool<typeof schema> => ({
  id,
  type: ToolType.builtin,
  description:
    'List evaluation datasets (id, name, description, tags, maturity, example count). Optionally narrow by name, tag, or curation level.',
  schema,
  handler: async ({ search, tags, maturity, limit }, { request, spaceId }) => {
    try {
      const { evals, security } = await deps.getStartDependencies();
      if (!(await hasReadEvalsPrivilege({ security, request, spaceId }))) {
        return errorResult(
          'You do not have the read_evals privilege required to list evaluation datasets in this space.'
        );
      }

      if (!evals.datasetService) {
        return errorResult(
          'Failed to list evaluation datasets: the evals dataset service is unavailable'
        );
      }

      const { datasets, total, facets } = await evals.datasetService.getClient({ spaceId }).list({
        search,
        tags,
        maturity,
        page: 1,
        perPage: limit ?? 50,
      });

      return otherResult({
        total,
        datasets: datasets.map((dataset) => ({
          id: dataset.id,
          name: dataset.name,
          description: dataset.description,
          tags: dataset.tags,
          maturity: dataset.maturity,
          examples_count: dataset.examples_count,
        })),
        available_tags: facets.tags.map(({ value }) => value),
      });
    } catch (error) {
      return toErrorResult(error, 'Failed to list evaluation datasets');
    }
  },
});
