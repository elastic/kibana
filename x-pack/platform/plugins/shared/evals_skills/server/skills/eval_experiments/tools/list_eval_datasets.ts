/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { MAX_NAME_LENGTH } from '@kbn/evals-plugin/common';
import { errorResult, evalsTools, otherResult, toErrorResult } from './common';
import { hasReadEvalsPrivilege } from './check_privileges';
import type { EvalExperimentsToolDeps } from './deps';

const schema = z.object({
  search: z
    .string()
    .max(MAX_NAME_LENGTH)
    .optional()
    .describe('Optional case-insensitive substring to filter datasets by name or description.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of datasets to return. Defaults to 50.'),
});

/**
 * Lists the evaluation datasets available to compose an experiment against.
 */
export const listEvalDatasetsTool = (
  deps: EvalExperimentsToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsTools.listDatasets,
  type: ToolType.builtin,
  description:
    'List evaluation datasets (id, name, description, example count). Use this to discover which dataset_ids to evaluate against when composing an experiment.',
  schema,
  handler: async ({ search, limit }, { request, spaceId }) => {
    try {
      const { evals, security } = await deps.getStartDependencies();
      if (!(await hasReadEvalsPrivilege({ security, request, spaceId }))) {
        return errorResult(
          'You do not have the read_evals privilege required to list evaluation datasets in this space.'
        );
      }

      if (!evals.datasetService) {
        return toErrorResult(
          new Error('the evals dataset service is unavailable'),
          'Failed to list evaluation datasets'
        );
      }

      const { datasets, total } = await evals.datasetService.getClient().list({
        search,
        page: 1,
        perPage: limit ?? 50,
      });

      return otherResult({
        total,
        datasets: datasets.map((dataset) => ({
          id: dataset.id,
          name: dataset.name,
          description: dataset.description,
          examples_count: dataset.examples_count,
        })),
      });
    } catch (error) {
      return toErrorResult(error, 'Failed to list evaluation datasets');
    }
  },
});
