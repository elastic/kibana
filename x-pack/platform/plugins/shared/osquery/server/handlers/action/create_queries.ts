/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isNumber, map, pickBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import { PARAMETER_NOT_FOUND } from '../../../common/translations/errors';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { replaceParamsQuery } from '../../../common/utils/replace_params_query';
import { isSavedQueryPrebuilt } from '../../routes/saved_query/utils';
import { savedQuerySavedObjectType } from '../../../common/types';
import type { SavedQuerySavedObject } from '../../common/types';
import { toEcsMappingRecord } from '../../lib/resolve_query_reference';
import { CustomHttpRequestError } from '../../common/error';

interface CreateDynamicQueriesParams {
  params: CreateLiveQueryRequestBodySchema;
  alertData?: ParsedTechnicalFields & { _index: string };
  agents: string[];
  osqueryContext: OsqueryAppContext;
  error?: string;
  spaceId: string;
  spaceScopedClient: SavedObjectsClient;
  /** When true, dispatch stored SO content even if the caller supplied a query. */
  useStoredQuery?: boolean;
}

export const createDynamicQueries = async ({
  params,
  alertData,
  agents,
  osqueryContext,
  error,
  spaceId,
  spaceScopedClient,
  useStoredQuery,
}: CreateDynamicQueriesParams) => {
  const storedSavedQuery = params.queries?.length
    ? undefined
    : await getSavedQueryContent(params.saved_query_id, spaceScopedClient);

  if (useStoredQuery && params.saved_query_id?.trim() && !storedSavedQuery) {
    throw new CustomHttpRequestError(
      `Saved query [${params.saved_query_id.trim()}] could not be resolved`,
      400
    );
  }

  const query = useStoredQuery
    ? storedSavedQuery?.query ?? params.query
    : params.query ?? storedSavedQuery?.query;
  const ecsMapping = useStoredQuery
    ? storedSavedQuery?.ecs_mapping ?? params.ecs_mapping
    : params.ecs_mapping ?? storedSavedQuery?.ecs_mapping;

  return params.queries?.length
    ? map(params.queries, ({ query: packQuery, ...restQuery }) => {
        const replacedQuery = replacedQueries(packQuery, alertData);

        return pickBy(
          {
            ...replacedQuery,
            ...restQuery,
            ...(error ? { error } : {}),
            action_id: uuidv4(),
            alert_ids: params.alert_ids,
            agents,
          },
          (value) => !isEmpty(value) || value === true || isNumber(value)
        );
      })
    : [
        pickBy(
          {
            action_id: uuidv4(),
            id: uuidv4(),
            ...replacedQueries(query, alertData),
            saved_query_id: params.saved_query_id,
            saved_query_prebuilt: params.saved_query_id
              ? await isSavedQueryPrebuilt(
                  osqueryContext.service.getPackageService()?.asInternalUser,
                  params.saved_query_id,
                  spaceScopedClient,
                  spaceId
                )
              : undefined,
            ecs_mapping: ecsMapping,
            alert_ids: params.alert_ids,
            timeout: params.timeout,
            agents,
            ...(error ? { error } : {}),
          },
          (value) => !isEmpty(value) || isNumber(value)
        ),
      ];
};

/** Returns stored query content, or `undefined` on 404. Other SO errors propagate. */
const getSavedQueryContent = async (
  savedQueryId: string | undefined,
  spaceScopedClient: SavedObjectsClient
): Promise<{ query?: string; ecs_mapping?: Record<string, unknown> } | undefined> => {
  const trimmedSavedQueryId = savedQueryId?.trim();

  if (!trimmedSavedQueryId) {
    return undefined;
  }

  try {
    const savedQuerySO = await spaceScopedClient.get<SavedQuerySavedObject>(
      savedQuerySavedObjectType,
      trimmedSavedQueryId
    );

    return {
      query: savedQuerySO.attributes.query,
      ecs_mapping: toEcsMappingRecord(savedQuerySO.attributes.ecs_mapping),
    };
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
};

export const replacedQueries = (
  query: string | undefined,
  alertData?: ParsedTechnicalFields & { _index: string }
): { query: string | undefined; error?: string } => {
  if (alertData && query) {
    const { result, skipped } = replaceParamsQuery(query, alertData);

    return {
      query: result,
      ...(skipped
        ? {
            error: PARAMETER_NOT_FOUND,
          }
        : {}),
    };
  }

  return { query };
};
