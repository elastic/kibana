/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EXPERIMENT_DATASET_EXAMPLES_URL,
  API_VERSIONS,
  EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH,
  EXPERIMENT_EXAMPLES_PAGE_SIZE,
  INTERNAL_API_ACCESS,
  MAX_SCORES_PER_QUERY,
  buildDatasetExampleScoresQuery,
  buildDatasetExamplesPageSearch,
  buildDatasetExampleSummariesSearch,
  GetEvaluationExperimentDatasetExamplesRequestParams,
  GetEvaluationExperimentDatasetExamplesRequestQuery,
  type EvaluationExperimentExamplePreview,
  type EvaluationExperimentScoreSummary,
  type GetEvaluationExperimentDatasetExamplesResponse,
} from '@kbn/evals-common';
import type { FieldValue, SearchHit, SortResults } from '@elastic/elasticsearch/lib/api/types';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { handleMaximumResponseSizeExceededError } from '../utils/handle_response_size_error';

type GroupedExampleScores = GetEvaluationExperimentDatasetExamplesResponse['examples'][number];
type ContentPreview = NonNullable<EvaluationExperimentExamplePreview['input']>;

type HitFields = Record<string, FieldValue | FieldValue[]>;

const PREVIEW_SOURCE_FIELDS = [
  'example.id',
  'example.input',
  'task.repetition_index',
  'task.output',
] as const;

interface PreviewSource {
  example?: {
    id?: string;
    input?: unknown;
  };
  task?: {
    repetition_index?: number;
    output?: unknown;
  };
}

const getFieldValue = (fields: HitFields | undefined, field: string): FieldValue | undefined => {
  const value = fields?.[field];
  return Array.isArray(value) ? value[0] : value;
};

const getStringField = (fields: HitFields | undefined, field: string): string | undefined => {
  const value = getFieldValue(fields, field);
  return typeof value === 'string' ? value : undefined;
};

const getNumberField = (fields: HitFields | undefined, field: string): number | undefined => {
  const value = getFieldValue(fields, field);
  return typeof value === 'number' ? value : undefined;
};

const toExample = (hit: SearchHit): GroupedExampleScores | undefined => {
  const fields = hit.fields as HitFields | undefined;
  const exampleId = getStringField(fields, 'example.id');
  if (!exampleId) {
    return undefined;
  }

  return {
    example_id: exampleId,
    example_index: getNumberField(fields, 'example.index') ?? null,
    scores: [],
  };
};

const toScoreSummary = (
  hit: SearchHit
): { exampleId: string; score: EvaluationExperimentScoreSummary } | undefined => {
  const fields = hit.fields as HitFields | undefined;
  const timestamp = getStringField(fields, '@timestamp');
  const exampleId = getStringField(fields, 'example.id');
  const repetitionIndex = getNumberField(fields, 'task.repetition_index');
  const evaluatorName = getStringField(fields, 'evaluator.name');

  if (!timestamp || !exampleId || repetitionIndex === undefined || !evaluatorName) {
    return undefined;
  }

  const evaluatorModelId = getStringField(fields, 'evaluator.model.id');
  const evaluatorModelFamily = getStringField(fields, 'evaluator.model.family');
  const evaluatorModelProvider = getStringField(fields, 'evaluator.model.provider');

  return {
    exampleId,
    score: {
      '@timestamp': timestamp,
      task: {
        repetition_index: repetitionIndex,
        ...(getStringField(fields, 'task.trace_id') !== undefined
          ? { trace_id: getStringField(fields, 'task.trace_id') }
          : {}),
      },
      evaluator: {
        name: evaluatorName,
        ...(getNumberField(fields, 'evaluator.score') !== undefined
          ? { score: getNumberField(fields, 'evaluator.score') }
          : {}),
        ...(getStringField(fields, 'evaluator.label') !== undefined
          ? { label: getStringField(fields, 'evaluator.label') }
          : {}),
        ...(getStringField(fields, 'evaluator.trace_id') !== undefined
          ? { trace_id: getStringField(fields, 'evaluator.trace_id') }
          : {}),
        ...(evaluatorModelId
          ? {
              model: {
                id: evaluatorModelId,
                ...(evaluatorModelFamily ? { family: evaluatorModelFamily } : {}),
                ...(evaluatorModelProvider ? { provider: evaluatorModelProvider } : {}),
              },
            }
          : {}),
      },
    },
  };
};

const getTotalExamples = (aggregations: object | undefined): number => {
  const totalExamples = (aggregations as { total_examples?: { value?: number | null } } | undefined)
    ?.total_examples?.value;
  return totalExamples ?? 0;
};

const toContentPreview = (value: unknown): ContentPreview | null => {
  if (value == null) {
    return null;
  }

  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) {
    return null;
  }

  return {
    content: serialized.slice(0, EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH),
    truncated: serialized.length > EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH,
  };
};

const toExamplePreview = (
  hit: SearchHit
): { exampleId: string; preview: EvaluationExperimentExamplePreview } | undefined => {
  const source = hit._source as PreviewSource | undefined;
  const exampleId = source?.example?.id;
  const repetitionIndex = source?.task?.repetition_index;
  if (!exampleId || repetitionIndex === undefined) {
    return undefined;
  }

  return {
    exampleId,
    preview: {
      repetition_index: repetitionIndex,
      input: toContentPreview(source.example?.input),
      output: toContentPreview(source.task?.output),
    },
  };
};

export const registerGetExperimentDatasetExamplesRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENT_DATASET_EXAMPLES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get experiment dataset example scores',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(
              GetEvaluationExperimentDatasetExamplesRequestParams
            ),
            query: buildRouteValidationWithZod(GetEvaluationExperimentDatasetExamplesRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { experimentId, datasetId } = request.params;
          const {
            execution_id: executionId,
            page,
            include_previews: includePreviews,
          } = request.query;
          const evalsContext = await context.evals;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const filterId = executionId ?? experimentId;
          const filterField = executionId ? 'metadata.execution_id' : 'experiment_id';
          const examplesResponse = await evalsContext.evaluationScoreService.search(
            buildDatasetExamplesPageSearch(datasetId, filterId, page, {
              filterField,
              spaceId,
            })
          );

          const examples = (examplesResponse.hits?.hits ?? [])
            .map(toExample)
            .filter((example): example is GroupedExampleScores => example !== undefined);
          const groupedExamplesById = new Map(
            examples.map((example) => [example.example_id, example])
          );
          const exampleIds = examples.map(({ example_id: exampleId }) => exampleId);

          let searchAfter: SortResults | undefined;
          while (exampleIds.length > 0) {
            const scoresResponse = await evalsContext.evaluationScoreService.search(
              buildDatasetExampleSummariesSearch(datasetId, filterId, exampleIds, {
                filterField,
                spaceId,
                searchAfter,
              })
            );
            const hits = scoresResponse.hits?.hits ?? [];

            for (const hit of hits) {
              const summary = toScoreSummary(hit);
              if (summary) {
                groupedExamplesById.get(summary.exampleId)?.scores.push(summary.score);
              }
            }

            if (hits.length < MAX_SCORES_PER_QUERY) {
              break;
            }

            searchAfter = hits.at(-1)?.sort;
            if (!searchAfter) {
              throw new Error('Missing score sort values required to continue pagination');
            }
          }

          if (includePreviews && exampleIds.length > 0) {
            const previewQuery = buildDatasetExampleScoresQuery(datasetId, filterId, {
              filterField,
              spaceId,
            });
            previewQuery.bool.must.push({ terms: { 'example.id': exampleIds } });
            const previewsResponse = await evalsContext.evaluationScoreService.search({
              query: previewQuery,
              size: EXPERIMENT_EXAMPLES_PAGE_SIZE,
              _source_includes: [...PREVIEW_SOURCE_FIELDS],
              collapse: { field: 'example.id' },
              sort: [
                { 'task.repetition_index': { order: 'asc', missing: '_last' } },
                { _shard_doc: { order: 'asc' } },
              ],
              track_total_hits: false,
            });

            for (const hit of previewsResponse.hits?.hits ?? []) {
              const result = toExamplePreview(hit);
              if (result) {
                const example = groupedExamplesById.get(result.exampleId);
                if (example) {
                  example.preview = result.preview;
                }
              }
            }
          }

          return response.ok({
            body: {
              examples,
              page,
              per_page: EXPERIMENT_EXAMPLES_PAGE_SIZE,
              total: getTotalExamples(examplesResponse.aggregations),
            },
          });
        } catch (error) {
          const tooLarge = handleMaximumResponseSizeExceededError({
            error,
            response,
            logger,
            context: 'Get experiment dataset examples',
          });
          if (tooLarge) return tooLarge;

          logger.error(`Failed to get experiment dataset examples: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get experiment dataset examples' },
          });
        }
      }
    );
};
