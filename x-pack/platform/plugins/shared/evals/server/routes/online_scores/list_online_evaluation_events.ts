/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS,
  EVALS_EVENTS_LOGS_INDEX_PATTERN,
  EVALS_ONLINE_EVALUATION_EVENTS_URL,
  GEN_AI_EVALUATION_RESULT_EVENT,
  INTERNAL_API_ACCESS,
  ListOnlineEvaluationEventsRequestQuery,
  type ListOnlineEvaluationEventsResponse,
} from '@kbn/evals-common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { getEsErrorLogDetails } from '../utils/get_es_error_log_details';

interface EvaluationEventDocument {
  '@timestamp': string | number;
  trace_id: string;
  attributes?: Record<string, unknown>;
}

type OnlineEvaluationEventItem = ListOnlineEvaluationEventsResponse['data'][number];

const getStringAttribute = (
  attributes: Record<string, unknown>,
  attributeName: string
): string | undefined => {
  const value = attributes[attributeName];
  return typeof value === 'string' ? value : undefined;
};

const toOnlineEvaluationEventItem = (
  source: EvaluationEventDocument
): OnlineEvaluationEventItem | undefined => {
  const attributes = source.attributes;
  if (!attributes) {
    return undefined;
  }

  const monitorId = getStringAttribute(
    attributes,
    EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_ID
  );
  const monitorName = getStringAttribute(
    attributes,
    EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_NAME
  );
  const evaluatorName = getStringAttribute(
    attributes,
    EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_NAME
  );
  const evaluatorVersion = getStringAttribute(
    attributes,
    EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_VERSION
  );
  const evaluatorKind = getStringAttribute(
    attributes,
    EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_KIND
  );
  const evaluationName = getStringAttribute(
    attributes,
    EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATION_NAME
  );

  if (
    !monitorId ||
    !monitorName ||
    !evaluatorName ||
    !evaluatorVersion ||
    (evaluatorKind !== 'llm' && evaluatorKind !== 'code') ||
    !evaluationName
  ) {
    return undefined;
  }

  const connectorId = getStringAttribute(
    attributes,
    EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.CONNECTOR_ID
  );
  const evaluatorTraceId = getStringAttribute(
    attributes,
    EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_TRACE_ID
  );
  const scoreValue = attributes[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SCORE_VALUE];
  const scoreLabel = getStringAttribute(
    attributes,
    EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SCORE_LABEL
  );
  const explanation = getStringAttribute(
    attributes,
    EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EXPLANATION
  );

  return {
    '@timestamp': new Date(source['@timestamp']).toISOString(),
    trace_id: source.trace_id,
    monitor: {
      id: monitorId,
      name: monitorName,
    },
    ...(connectorId !== undefined ? { connector_id: connectorId } : {}),
    evaluator: {
      name: evaluatorName,
      version: evaluatorVersion,
      kind: evaluatorKind,
      ...(evaluatorTraceId !== undefined ? { trace_id: evaluatorTraceId } : {}),
    },
    score: {
      name: evaluationName,
      ...(typeof scoreValue === 'number' ? { value: scoreValue } : {}),
      ...(scoreLabel !== undefined ? { label: scoreLabel } : {}),
      ...(explanation !== undefined ? { explanation } : {}),
    },
  };
};

export const registerListOnlineEvaluationEventsRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_ONLINE_EVALUATION_EVENTS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'List online evaluation events',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(ListOnlineEvaluationEventsRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
          const coreContext = await context.core;
          const { page, per_page: perPage, monitor_id: monitorId } = request.query;
          const searchResponse =
            await coreContext.elasticsearch.client.asInternalUser.search<EvaluationEventDocument>({
              index: EVALS_EVENTS_LOGS_INDEX_PATTERN,
              ignore_unavailable: true,
              allow_no_indices: true,
              from: (page - 1) * perPage,
              size: perPage,
              _source_excludes: [
                `attributes.${EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SCORE_METADATA}`,
              ],
              track_total_hits: true,
              sort: [{ '@timestamp': { order: 'desc' } }],
              query: {
                bool: {
                  filter: [
                    { term: { event_name: GEN_AI_EVALUATION_RESULT_EVENT } },
                    {
                      term: {
                        [`attributes.${EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_ID}`]:
                          monitorId,
                      },
                    },
                    {
                      term: {
                        [`attributes.${EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SPACE_ID}`]: spaceId,
                      },
                    },
                  ],
                },
              },
            });

          const total =
            typeof searchResponse.hits.total === 'number'
              ? searchResponse.hits.total
              : searchResponse.hits.total?.value ?? 0;
          const data = searchResponse.hits.hits.flatMap(({ _source: source }) => {
            if (!source) {
              return [];
            }

            const item = toOnlineEvaluationEventItem(source);
            return item ? [item] : [];
          });

          return response.ok({
            body: { total, data },
          });
        } catch (error) {
          const { message, meta } = getEsErrorLogDetails(error);
          logger.error(`Failed to list online evaluation events: ${message}`, meta);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list online evaluation events' },
          });
        }
      }
    );
};
