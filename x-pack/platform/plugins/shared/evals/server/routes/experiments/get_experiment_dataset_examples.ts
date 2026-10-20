/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EXPERIMENT_DATASET_EXAMPLES_URL,
  API_VERSIONS,
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
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES, EXPERIMENT_LIMITS } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { handleMaximumResponseSizeExceededError } from '../utils/handle_response_size_error';
import { EXAMPLE_REPETITION_PAYLOAD_SORT, previewScriptField } from './preview_source_script';

type GroupedExampleScores = GetEvaluationExperimentDatasetExamplesResponse['examples'][number];
type ContentPreview = NonNullable<EvaluationExperimentExamplePreview['input']>;

const BULK_SCORE_SOURCE_EXCLUDES = ['example.input', 'task.output'];

interface ScriptedPreviewHit {
  _source?: { task?: { repetition_index?: number } };
  fields?: { input_preview?: unknown; output_preview?: unknown };
}

interface PreviewTermsAggregation {
  buckets?: Array<{
    key?: string | number;
    repetitions?: {
      buckets?: Array<{
        key?: string | number;
        source?: { hits?: { hits?: ScriptedPreviewHit[] } };
      }>;
    };
  }>;
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

const readScriptedPreview = (value: unknown): ContentPreview | null => {
  const entry = Array.isArray(value) ? value[0] : value;
  if (entry == null || typeof entry !== 'object') {
    return null;
  }

  const preview = entry as { content?: unknown; truncated?: unknown };
  if (typeof preview.content !== 'string' || typeof preview.truncated !== 'boolean') {
    return null;
  }

  return { content: preview.content, truncated: preview.truncated };
};

const readRepetitionIndex = (
  hit: ScriptedPreviewHit | undefined,
  bucketKey: unknown
): number | undefined => {
  const fromSource = hit?._source?.task?.repetition_index;
  if (typeof fromSource === 'number') {
    return fromSource;
  }
  const fromKey = typeof bucketKey === 'number' ? bucketKey : Number(bucketKey);
  return Number.isInteger(fromKey) && fromKey >= 0 ? fromKey : undefined;
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
            ...(includePreviews
              ? {
                  aggs: {
                    previews: {
                      terms: { field: 'example.id', size: MAX_SCORES_PER_QUERY },
                      aggs: {
                        repetitions: {
                          terms: {
                            field: 'task.repetition_index',
                            size: EXPERIMENT_LIMITS.maxRepetitions,
                            order: { _key: 'asc' },
                          },
                          aggs: {
                            source: {
                              top_hits: {
                                size: 1,
                                sort: EXAMPLE_REPETITION_PAYLOAD_SORT,
                                _source: { includes: ['task.repetition_index'] },
                                script_fields: {
                                  input_preview: previewScriptField('example', 'input'),
                                  output_preview: previewScriptField('task', 'output'),
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                }
              : {}),
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
          const previewAggregation = (
            searchResponse.aggregations as { previews?: PreviewTermsAggregation } | undefined
          )?.previews;
          const previewBuckets = previewAggregation?.buckets;
          for (const bucket of previewBuckets ?? []) {
            const exampleId = bucket.key == null ? undefined : String(bucket.key);
            const example = exampleId ? groupedExamplesById.get(exampleId) : undefined;
            if (!example) {
              continue;
            }

            const previews: EvaluationExperimentExamplePreview[] = [];
            for (const repetitionBucket of bucket.repetitions?.buckets ?? []) {
              const hit = repetitionBucket.source?.hits?.hits?.[0];
              const repetitionIndex = readRepetitionIndex(hit, repetitionBucket.key);
              if (!hit || repetitionIndex === undefined) {
                continue;
              }

              previews.push({
                repetition_index: repetitionIndex,
                input: readScriptedPreview(hit.fields?.input_preview),
                output: readScriptedPreview(hit.fields?.output_preview),
              });
            }

            if (previews.length > 0) {
              example.previews = previews.sort(
                (left, right) => left.repetition_index - right.repetition_index
              );
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
