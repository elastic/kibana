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
  INTERNAL_API_ACCESS,
  MAX_SCORES_PER_QUERY,
  buildDatasetExampleScoresQuery,
  SCORES_SORT_ORDER,
  GetEvaluationExperimentDatasetExamplesRequestParams,
  GetEvaluationExperimentDatasetExamplesRequestQuery,
  type EvaluationExperimentExamplePreview,
  type EvaluationScoreDocument,
  type GetEvaluationExperimentDatasetExamplesResponse,
} from '@kbn/evals-common';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { handleMaximumResponseSizeExceededError } from '../utils/handle_response_size_error';

type GroupedExampleScores = GetEvaluationExperimentDatasetExamplesResponse['examples'][number];
type ContentPreview = NonNullable<EvaluationExperimentExamplePreview['input']>;

const BULK_SCORE_SOURCE_EXCLUDES = ['example.input', 'task.output'];

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

const getExampleId = ({ example }: EvaluationScoreDocument): string => example.id;

const getExampleIndex = ({ example }: EvaluationScoreDocument): number | null =>
  example.index ?? null;

const isValidScoreDocument = (source: unknown): source is EvaluationScoreDocument => {
  if (source === null || source === undefined || typeof source !== 'object') {
    return false;
  }

  const maybeScore = source as { example?: { id?: unknown } };
  return typeof maybeScore.example?.id === 'string' && maybeScore.example.id.length > 0;
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
          const { execution_id: executionId, include_previews: includePreviews } = request.query;
          const evalsContext = await context.evals;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const filterId = executionId ?? experimentId;
          const filterField = executionId ? 'metadata.execution_id' : 'experiment_id';
          const searchResponse = await evalsContext.evaluationScoreService.search({
            query: buildDatasetExampleScoresQuery(datasetId, filterId, { filterField, spaceId }),
            sort: SCORES_SORT_ORDER,
            size: MAX_SCORES_PER_QUERY,
            _source_excludes: BULK_SCORE_SOURCE_EXCLUDES,
          });

          const scores = (searchResponse.hits?.hits ?? [])
            .map((hit) => hit._source)
            .filter(isValidScoreDocument);

          const groupedExamplesById = new Map<string, GroupedExampleScores>();
          for (const score of scores) {
            const exampleId = getExampleId(score);
            const existingGroup = groupedExamplesById.get(exampleId);
            if (existingGroup) {
              existingGroup.scores.push(score);
              continue;
            }

            groupedExamplesById.set(exampleId, {
              example_id: exampleId,
              example_index: getExampleIndex(score),
              scores: [score],
            });
          }

          const examples = Array.from(groupedExamplesById.values()).sort((left, right) => {
            if (left.example_index === null) return 1;
            if (right.example_index === null) return -1;
            return left.example_index - right.example_index;
          });
          const exampleIds = examples.map(({ example_id: exampleId }) => exampleId);

          if (includePreviews && exampleIds.length > 0) {
            const previewQuery = buildDatasetExampleScoresQuery(datasetId, filterId, {
              filterField,
              spaceId,
            });
            previewQuery.bool.must.push({ terms: { 'example.id': exampleIds } });
            const previewsResponse = await evalsContext.evaluationScoreService.search({
              query: previewQuery,
              size: exampleIds.length,
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

          return response.ok({ body: { examples } });
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
