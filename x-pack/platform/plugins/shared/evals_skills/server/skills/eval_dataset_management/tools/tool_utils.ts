/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core/server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import {
  DatasetMaturity,
  MAX_DATASET_DESCRIPTION_LENGTH,
  MAX_DATASET_NAME_LENGTH,
  MAX_EXAMPLES_PER_DATASET,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_DATASET,
} from '@kbn/evals-common';
import { MAX_ID_LENGTH } from '@kbn/evals-plugin/common';
import type { EvalsPluginStart } from '@kbn/evals-plugin/server';
import { hasManageEvalsPrivilege, hasReadEvalsPrivilege } from '../../common/check_privileges';
import { evalsDatasetTools } from '../../common/tool_ids';
import { errorResult, toErrorResult } from '../../common/tool_results';
import type { EvalDatasetManagementToolDeps } from './deps';

export { evalsDatasetTools };
export { errorResult, otherResult, toErrorResult } from '../../common/tool_results';

/** How many examples `get_dataset` returns. The rest are reported as omitted. */
export const MAX_RETURNED_DATASET_EXAMPLES = 50;

const TAG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:._-]*$/;

export const datasetNameSchema = z
  .string()
  .min(1)
  .max(MAX_DATASET_NAME_LENGTH)
  .describe('Dataset name. Unique within the current space.');

export const datasetDescriptionSchema = z
  .string()
  .max(MAX_DATASET_DESCRIPTION_LENGTH)
  .describe('What the dataset is for.');

export const datasetIdSchema = z
  .string()
  .min(1)
  .max(MAX_ID_LENGTH)
  .describe('Dataset id, as returned by list_datasets or get_dataset.');

export const datasetTagsSchema = z
  .array(z.string().min(1).max(MAX_TAG_LENGTH).regex(TAG_PATTERN))
  .max(MAX_TAGS_PER_DATASET)
  .describe(
    'Labels for what the dataset is about, for example "esql". Lowercased on write. Letters, numbers, and : . _ - only.'
  );

export const datasetMaturitySchema = DatasetMaturity.describe(
  'Curation level: "raw", "cleaned", or "golden".'
);

const exampleRecordSchema = z.record(z.string().max(MAX_ID_LENGTH), z.unknown());

export const datasetExampleSchema = z.object({
  input: exampleRecordSchema
    .optional()
    .describe('The example input, such as the prompt or request sent to the target.'),
  output: exampleRecordSchema.optional().describe('The expected output. Omit only when unknown.'),
  metadata: exampleRecordSchema
    .optional()
    .describe('Optional extra fields stored with the example.'),
});

export const datasetExamplesSchema = z
  .array(datasetExampleSchema)
  .max(MAX_EXAMPLES_PER_DATASET)
  .describe(
    `Examples to store. A dataset holds at most ${MAX_EXAMPLES_PER_DATASET} examples. input is what is sent to the target; output is the expected output.`
  );

export type DatasetClient = ReturnType<
  NonNullable<EvalsPluginStart['datasetService']>['getClient']
>;

const DATASET_ALREADY_EXISTS = 'DatasetAlreadyExistsError';

export const isDatasetAlreadyExistsError = (error: unknown): error is Error =>
  error instanceof Error && error.name === DATASET_ALREADY_EXISTS;

/** Create failed because the name is taken. Points the agent at upsert. */
export const datasetAlreadyExistsResult = (error: Error): ToolHandlerStandardReturn =>
  errorResult(
    `${error.message}. Use ${evalsDatasetTools.upsertDataset} to replace its examples, or choose a different name.`
  );

type DatasetPrivilege = 'read' | 'manage';

const privilegeCheck = {
  read: hasReadEvalsPrivilege,
  manage: hasManageEvalsPrivilege,
} as const;

const privilegeName = {
  read: 'read_evals',
  manage: 'manage_evals',
} as const;

/**
 * Loads a space-scoped dataset client after the privilege check. Returns an
 * error result when the caller lacks the privilege or the service is down.
 */
export const loadDatasetClient = async (
  deps: EvalDatasetManagementToolDeps,
  { request, spaceId }: { request: KibanaRequest; spaceId: string },
  privilege: DatasetPrivilege,
  action: string
): Promise<{ client: DatasetClient } | { error: ToolHandlerStandardReturn }> => {
  const { evals, security } = await deps.getStartDependencies();
  if (!(await privilegeCheck[privilege]({ security, request, spaceId }))) {
    return {
      error: errorResult(
        `You do not have the ${privilegeName[privilege]} privilege required to ${action} in this space.`
      ),
    };
  }

  if (!evals.datasetService) {
    return {
      error: toErrorResult(
        new Error('the evals dataset service is unavailable'),
        `Failed to ${action}`
      ),
    };
  }

  return { client: evals.datasetService.getClient({ spaceId }) };
};
