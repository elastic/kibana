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
  AddExamplesPayload,
  DatasetMaturity,
  DatasetTags,
  MAX_DATASET_DESCRIPTION_LENGTH,
  MAX_DATASET_NAME_LENGTH,
  MAX_EXAMPLES_PER_DATASET,
} from '@kbn/evals-common';
import { MAX_ID_LENGTH } from '@kbn/evals-plugin/common';
import type { EvalsPluginStart } from '@kbn/evals-plugin/server';
import { hasManageEvalsPrivilege, hasReadEvalsPrivilege } from '../../common/check_privileges';
import { evalsDatasetTools } from '../../common/tool_ids';
import { errorResult } from '../../common/tool_results';
import type { EvalDatasetManagementToolDeps } from './deps';

export { evalsDatasetTools };
export { errorResult, otherResult, toErrorResult } from '../../common/tool_results';

/** How many examples `get_dataset` returns. The rest are reported as omitted. */
export const MAX_RETURNED_DATASET_EXAMPLES = 50;

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
  .describe(
    `Dataset id, as returned by ${evalsDatasetTools.listDatasets} or ${evalsDatasetTools.getDataset}.`
  );

export const datasetTagsSchema = DatasetTags.describe(
  'Labels for what the dataset is about, for example "esql". Lowercased on write. Letters, numbers, and : . _ - only.'
);

export const datasetMaturitySchema = DatasetMaturity.describe(
  'Curation level: "raw", "cleaned", or "golden".'
);

const { shape: examplePayloadShape } = AddExamplesPayload;

export const datasetExampleSchema = AddExamplesPayload.extend({
  input: examplePayloadShape.input.describe(
    'The example input, such as the prompt or request sent to the target.'
  ),
  output: examplePayloadShape.output.describe('The expected output. Omit only when unknown.'),
  metadata: examplePayloadShape.metadata.describe('Optional extra fields stored with the example.'),
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

export type DatasetDocument = NonNullable<Awaited<ReturnType<DatasetClient['getMetadata']>>>;

type DatasetExample = z.infer<typeof datasetExampleSchema>;

const MAX_CONFIRMATION_EXAMPLES = 3;
const MAX_CONFIRMATION_VALUE_LENGTH = 200;

/**
 * Renders a caller-supplied value as inline code, so it shows verbatim in the
 * markdown confirmation instead of being interpreted as markup.
 */
export const inlineCode = (value: string): string => {
  const flattened = value.replace(/`/g, "'").replace(/\s+/g, ' ').trim();
  if (!flattened) {
    return '_empty_';
  }
  const shown =
    flattened.length > MAX_CONFIRMATION_VALUE_LENGTH
      ? `${flattened.slice(0, MAX_CONFIRMATION_VALUE_LENGTH)}…`
      : flattened;
  return `\`${shown}\``;
};

export const formatTags = (tags: readonly string[] | undefined): string =>
  tags?.length ? tags.map(inlineCode).join(', ') : '_none_';

export const formatMaturity = (maturity: string | undefined): string =>
  maturity ? inlineCode(maturity) : '_not set_';

const formatExampleValue = (value: DatasetExample['input']): string =>
  value == null ? '_none_' : inlineCode(JSON.stringify(value));

/** Markdown blocks previewing the first few examples and flagging missing expected outputs. */
export const formatExamplesPreview = (examples: readonly DatasetExample[]): string[] => {
  if (examples.length === 0) {
    return [];
  }

  const shown = examples
    .slice(0, MAX_CONFIRMATION_EXAMPLES)
    .map(
      ({ input, output }, index) =>
        `${index + 1}. Input: ${formatExampleValue(
          input
        )}\n   Expected output: ${formatExampleValue(output)}`
    );
  const hidden = examples.length - shown.length;
  const withoutOutput = examples.filter(({ output }) => output == null).length;

  return [
    `**First examples:**\n\n${shown.join('\n')}`,
    ...(hidden > 0 ? [`…and ${hidden} more.`] : []),
    ...(withoutOutput > 0 ? [`**${withoutOutput} example(s) have no expected output.**`] : []),
  ];
};

/** Joins markdown blocks into a confirmation message body. */
export const toConfirmationMessage = (blocks: readonly string[]): string => blocks.join('\n\n');

/** Matches evals storage errors by name, since their classes aren't exported by the plugin. */
const isEvalsError = (error: unknown, name: string): error is Error =>
  error instanceof Error && error.name === name;

export const isDatasetAlreadyExistsError = (error: unknown): error is Error =>
  isEvalsError(error, 'DatasetAlreadyExistsError');

export const isDatasetExamplesLimitExceededError = (error: unknown): error is Error =>
  isEvalsError(error, 'DatasetExamplesLimitExceededError');

export const datasetNotFoundResult = (datasetId: string): ToolHandlerStandardReturn =>
  errorResult(`Evaluation dataset not found: ${datasetId}`);

/** Create failed because the name is taken. Points the agent at the tools that edit it. */
export const datasetAlreadyExistsResult = (error: Error): ToolHandlerStandardReturn =>
  errorResult(
    `${error.message}. Use ${evalsDatasetTools.editExamples} to add to it, ${evalsDatasetTools.upsertDataset} to replace its examples, or choose a different name.`
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
      error: errorResult(`Failed to ${action}: the evals dataset service is unavailable`),
    };
  }

  return { client: evals.datasetService.getClient({ spaceId }) };
};

/**
 * Builds a confirmation that needs to read datasets first. Falls back to
 * `fallback` when the lookup is refused or fails, so the prompt still shows.
 */
export const withDatasetLookup = async <T>(
  deps: EvalDatasetManagementToolDeps,
  { request, spaceId }: { request: KibanaRequest; spaceId: string },
  fallback: T,
  build: (client: DatasetClient) => Promise<T>
): Promise<T> => {
  try {
    const loaded = await loadDatasetClient(
      deps,
      { request, spaceId },
      'read',
      'preview an evaluation dataset change'
    );
    if ('error' in loaded) {
      return fallback;
    }
    return await build(loaded.client);
  } catch (error) {
    deps.logger.debug(`Failed to build a dataset confirmation message: ${error}`);
    return fallback;
  }
};
