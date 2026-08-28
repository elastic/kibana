/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isNumber, map, pickBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import { PARAMETER_NOT_FOUND } from '../../../common/translations/errors';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { replaceParamsQuery } from '../../../common/utils/replace_params_query';
import { isSavedQueryPrebuilt } from '../../routes/saved_query/utils';
import { savedQuerySavedObjectType } from '../../../common/types';
import type { SavedQuerySavedObject } from '../../common/types';
import { convertECSMappingToObject } from '../../routes/utils';

interface CreateDynamicQueriesParams {
  params: CreateLiveQueryRequestBodySchema;
  alertData?: ParsedTechnicalFields & { _index: string };
  agents: string[];
  osqueryContext: OsqueryAppContext;
  error?: string;
  spaceId: string;
  spaceScopedClient: SavedObjectsClient;
}

export const createDynamicQueries = async ({
  params,
  alertData,
  agents,
  osqueryContext,
  error,
  spaceId,
  spaceScopedClient,
}: CreateDynamicQueriesParams) => {
  const storedSavedQuery = params.queries?.length
    ? undefined
    : await getSavedQueryContent(params.saved_query_id, spaceScopedClient);

  return params.queries?.length
    ? map(params.queries, ({ query, ...restQuery }) => {
        const replacedQuery = replacedQueries(query, alertData);

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
            ...replacedQueries(
              // Derive the SQL from the referenced saved query when the caller did not
              // supply it. A caller holding only `runSavedQueries` is never permitted to
              // supply SQL of their own (see isOsqueryResponseActionAuthorized), so the
              // stored query is the authoritative source for this path.
              params.query ?? storedSavedQuery?.query,
              alertData
            ),
            saved_query_id: params.saved_query_id,
            saved_query_prebuilt: params.saved_query_id
              ? await isSavedQueryPrebuilt(
                  osqueryContext.service.getPackageService()?.asInternalUser,
                  params.saved_query_id,
                  spaceScopedClient,
                  spaceId
                )
              : undefined,
            ecs_mapping: params.ecs_mapping ?? storedSavedQuery?.ecs_mapping,
            alert_ids: params.alert_ids,
            timeout: params.timeout,
            agents,
            ...(error ? { error } : {}),
          },
          (value) => !isEmpty(value) || isNumber(value)
        ),
      ];
};

/**
 * Reads the stored query and ecs_mapping off a saved query saved object.
 *
 * Used when a live query references a `saved_query_id` but carries no SQL / mapping of
 * its own, which is the normal shape for a caller authorized only by `runSavedQueries`.
 * Returns `undefined` when there is no reference or it cannot be read.
 */
const getSavedQueryContent = async (
  savedQueryId: string | undefined,
  spaceScopedClient: SavedObjectsClient
): Promise<{ query?: string; ecs_mapping?: Record<string, unknown> } | undefined> => {
  if (!savedQueryId) {
    return undefined;
  }

  try {
    const savedQuerySO = await spaceScopedClient.get<SavedQuerySavedObject>(
      savedQuerySavedObjectType,
      savedQueryId
    );

    const storedMapping = savedQuerySO.attributes.ecs_mapping;
    const ecsMapping = Array.isArray(storedMapping)
      ? convertECSMappingToObject(storedMapping)
      : storedMapping;

    return {
      query: savedQuerySO.attributes.query,
      ecs_mapping: ecsMapping && Object.keys(ecsMapping).length ? ecsMapping : undefined,
    };
  } catch (error) {
    return undefined;
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
