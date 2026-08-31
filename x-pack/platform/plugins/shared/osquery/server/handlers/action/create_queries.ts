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
import { lookupSavedQuery, type ResolvedQueryReference } from '../../lib/resolve_query_reference';
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
  /** Authz-resolved saved query; when set, skip a second SO lookup. */
  storedQuery?: ResolvedQueryReference;
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
  storedQuery,
}: CreateDynamicQueriesParams) => {
  const savedQueryId = params.saved_query_id?.trim();
  const enforceStoredSavedQuery = Boolean(useStoredQuery && savedQueryId);
  const storedSavedQuery =
    storedQuery ??
    (params.queries?.length && !enforceStoredSavedQuery
      ? undefined
      : await lookupSavedQuery(spaceScopedClient, savedQueryId ?? ''));

  if (enforceStoredSavedQuery && !storedSavedQuery) {
    throw new CustomHttpRequestError(`Saved query [${savedQueryId}] could not be resolved`, 400);
  }

  const query = useStoredQuery
    ? storedSavedQuery?.query ?? params.query
    : params.query ?? storedSavedQuery?.query;
  const ecsMapping = useStoredQuery
    ? storedSavedQuery?.ecs_mapping ?? params.ecs_mapping
    : params.ecs_mapping ?? storedSavedQuery?.ecs_mapping;
  const prebuiltId = storedSavedQuery?.savedObjectId ?? savedQueryId;

  if (params.queries?.length && !enforceStoredSavedQuery) {
    return map(params.queries, ({ query: packQuery, ...restQuery }) => {
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
    });
  }

  return [
    pickBy(
      {
        action_id: uuidv4(),
        id: uuidv4(),
        ...replacedQueries(query, alertData),
        saved_query_id: params.saved_query_id,
        saved_query_prebuilt: prebuiltId
          ? await isSavedQueryPrebuilt(
              osqueryContext.service.getPackageService()?.asInternalUser,
              prebuiltId,
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
