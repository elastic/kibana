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
import {
  PARAMETER_NOT_FOUND,
  SAVED_QUERY_LOOKUP_FAILED,
  SAVED_QUERY_NOT_FOUND,
} from '../../../common/translations/errors';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import {
  containsDynamicQuery,
  replaceParamsQuery,
} from '../../../common/utils/replace_params_query';
import { isSavedQueryPrebuilt } from '../../routes/saved_query/utils';
import { lookupSavedQuery, type ResolvedQueryReference } from '../../lib/resolve_query_reference';
import { CustomHttpRequestError } from '../../common/error';
import type { DispatchSource } from './dispatch_source';
import {
  convertSOQueriesToPack,
  isPackQueryEnabled,
  resolveEffectiveQueryExecution,
} from '../../routes/pack/utils';
import type { PackSavedObject } from '../../common/types';

interface BuildQueriesParams {
  source: DispatchSource;
  params: CreateLiveQueryRequestBodySchema;
  alertData?: ParsedTechnicalFields & { _index: string };
  agents: string[];
  osqueryContext: OsqueryAppContext;
  error?: string;
  spaceId: string;
  spaceScopedClient: SavedObjectsClient;
  /** Pack saved object when source.kind is 'caller' with a pack_id, or 'pack'. */
  packSO?: { attributes: PackSavedObject };
}

/**
 * Builds the query rows to dispatch to Fleet, per the DispatchSource discriminated union (design D2).
 * One builder, one exhaustive switch — every dispatch decision lives here.
 */
export const buildQueries = async ({
  source,
  params,
  alertData,
  agents,
  osqueryContext,
  error,
  spaceId,
  spaceScopedClient,
  packSO,
}: BuildQueriesParams) => {
  switch (source.kind) {
    case 'caller': {
      // Pre-#287882 behaviour: dispatch request/rule params as-is.
      // Pack SO takes priority over inline queries[] (pre-PR behaviour: pack is always loaded when pack_id is set).
      if (packSO) {
        return map(
          pickBy(convertSOQueriesToPack(packSO.attributes.queries), isPackQueryEnabled),
          (packQuery, packQueryId) => {
            // writeLiveQueries callers may send literal {{...}} templates — don't flag them
            const replacedQuery = replacedQueries(packQuery.query, alertData, false);
            const { version, platform } = resolveEffectiveQueryExecution(packQuery, {
              min_osquery_version: packSO.attributes.min_osquery_version,
              platform: packSO.attributes.platform ?? undefined,
            });

            return pickBy(
              {
                action_id: uuidv4(),
                id: packQueryId,
                ...replacedQuery,
                ...(error ? { error } : {}),
                ecs_mapping: packQuery.ecs_mapping,
                version,
                platform,
                timeout: packQuery.timeout,
                agents,
              },
              (value) => !isEmpty(value) || isNumber(value)
            );
          }
        );
      }

      if (params.queries?.length) {
        return map(params.queries, ({ query: packQuery, ...restQuery }) => {
          const replacedQuery = replacedQueries(packQuery, alertData, false);

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
            ...replacedQueries(params.query, alertData, false),
            saved_query_id: params.saved_query_id,
            saved_query_prebuilt: params.saved_query_id
              ? await isSavedQueryPrebuilt(
                  osqueryContext.service.getPackageService()?.asInternalUser,
                  params.saved_query_id,
                  spaceScopedClient,
                  spaceId
                )
              : undefined,
            ecs_mapping: isEmpty(params.ecs_mapping) ? undefined : params.ecs_mapping,
            alert_ids: params.alert_ids,
            timeout: params.timeout,
            agents,
            ...(error ? { error } : {}),
          },
          (value) => !isEmpty(value) || isNumber(value)
        ),
      ];
    }

    case 'investigation_guide': {
      return [
        pickBy(
          {
            action_id: uuidv4(),
            id: uuidv4(),
            ...replacedQueries(params.query, alertData, false),
            ecs_mapping: isEmpty(params.ecs_mapping) ? undefined : params.ecs_mapping,
            alert_ids: params.alert_ids,
            timeout: params.timeout,
            agents,
            ...(error ? { error } : {}),
          },
          (value) => !isEmpty(value) || isNumber(value)
        ),
      ];
    }

    case 'saved_query': {
      const { stored, savedQueryId } = source;

      if (params.queries?.length) {
        osqueryContext.logFactory
          .get('buildQueries')
          .warn(
            `Response action specifies both saved_query_id [${savedQueryId}] and ${params.queries.length} inline queries; dispatching the saved query only.`
          );
      }

      // nonEmpty(persisted) ?? stored for ecs_mapping (design D3 — stored-wins reverted)
      const suppliedEcsMapping = isEmpty(params.ecs_mapping) ? undefined : params.ecs_mapping;
      const ecsMapping = suppliedEcsMapping ?? stored.ecs_mapping;
      const prebuiltId = stored.savedObjectId ?? savedQueryId;

      return [
        pickBy(
          {
            action_id: uuidv4(),
            id: uuidv4(),
            ...replacedQueries(stored.query, alertData, true),
            saved_query_id: savedQueryId,
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
    }

    case 'pack': {
      if (!packSO) {
        return [
          {
            action_id: uuidv4(),
            id: source.packSavedObjectId,
            error: 'Pack could not be loaded',
            agents,
          },
        ];
      }

      return map(
        pickBy(convertSOQueriesToPack(packSO.attributes.queries), isPackQueryEnabled),
        (packQuery, packQueryId) => {
          const replacedQuery = replacedQueries(packQuery.query, alertData, true);
          const { version, platform } = resolveEffectiveQueryExecution(packQuery, {
            min_osquery_version: packSO.attributes.min_osquery_version,
            platform: packSO.attributes.platform ?? undefined,
          });

          return pickBy(
            {
              action_id: uuidv4(),
              id: packQueryId,
              ...replacedQuery,
              ...(error ? { error } : {}),
              ecs_mapping: packQuery.ecs_mapping,
              version,
              platform,
              timeout: packQuery.timeout,
              agents,
            },
            (value) => !isEmpty(value) || isNumber(value)
          );
        }
      );
    }

    case 'unresolved': {
      return [
        {
          action_id: uuidv4(),
          id: source.referenceId,
          error: source.error,
          agents,
        },
      ];
    }

    default: {
      const _exhaustive: never = source;

      return _exhaustive;
    }
  }
};

export const replacedQueries = (
  query: string | undefined,
  alertData?: ParsedTechnicalFields & { _index: string },
  /**
   * Set for stored (saved-query / pack) content. Rule-run resolves the stored SQL only after
   * the caller already decided whether this run is parameterized, so a template can reach here
   * with no alert context; flag it instead of dispatching literal `{{...}}` to the agent.
   * Ad-hoc `writeLiveQueries` SQL is left as-is — sending a template there is the caller's call.
   */
  requireSubstitution = false
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

  if (requireSubstitution && query && containsDynamicQuery(query)) {
    return { query, error: PARAMETER_NOT_FOUND };
  }

  return { query };
};

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
  /**
   * Rule runs have no caller to return a status code to — a throw here is swallowed by
   * `osqueryResponseAction` and the run still reports success. Record the failure on the
   * action document instead so it surfaces in the alert's Osquery Results tab.
   */
  reportErrorsOnAction?: boolean;
}

/**
 * Legacy wrapper kept for backward compatibility during the migration. Production dispatch
 * goes through `buildQueries` directly. Tests will be migrated in task 2.8.
 */
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
  reportErrorsOnAction,
}: CreateDynamicQueriesParams) => {
  const savedQueryId = params.saved_query_id?.trim();
  const enforceStoredSavedQuery = Boolean(useStoredQuery && savedQueryId);
  let resolvedStoredQuery = storedQuery;
  let unresolvedSavedQueryError: string | undefined;

  const shouldLookupSavedQuery = enforceStoredSavedQuery && resolvedStoredQuery === undefined;

  if (shouldLookupSavedQuery) {
    try {
      resolvedStoredQuery = await lookupSavedQuery(spaceScopedClient, savedQueryId ?? '');
    } catch (lookupError) {
      if (!reportErrorsOnAction) {
        throw lookupError;
      }

      unresolvedSavedQueryError = SavedObjectsErrorHelpers.isNotFoundError(lookupError)
        ? SAVED_QUERY_NOT_FOUND
        : SAVED_QUERY_LOOKUP_FAILED;
    }
  }

  if (enforceStoredSavedQuery && params.queries?.length) {
    osqueryContext.logFactory
      .get('createDynamicQueries')
      .warn(
        `Response action specifies both saved_query_id [${savedQueryId}] and ${params.queries.length} inline queries; dispatching the saved query only.`
      );
  }

  if (enforceStoredSavedQuery && resolvedStoredQuery?.query == null && !unresolvedSavedQueryError) {
    if (!reportErrorsOnAction) {
      throw new CustomHttpRequestError(`Saved query [${savedQueryId}] could not be resolved`, 400);
    }

    unresolvedSavedQueryError = SAVED_QUERY_NOT_FOUND;
  }

  if (unresolvedSavedQueryError) {
    return [
      pickBy(
        {
          action_id: uuidv4(),
          id: uuidv4(),
          error: unresolvedSavedQueryError,
          alert_ids: params.alert_ids,
          agents,
        },
        (value) => !isEmpty(value) || isNumber(value)
      ),
    ];
  }

  if (enforceStoredSavedQuery && resolvedStoredQuery) {
    return buildQueries({
      source: {
        kind: 'saved_query',
        savedQueryId: savedQueryId as string,
        stored: resolvedStoredQuery,
      },
      params,
      alertData,
      agents,
      osqueryContext,
      error,
      spaceId,
      spaceScopedClient,
    });
  }

  return buildQueries({
    source: { kind: 'caller' },
    params,
    alertData,
    agents,
    osqueryContext,
    error,
    spaceId,
    spaceScopedClient,
  });
};
