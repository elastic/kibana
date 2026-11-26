/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import unified from 'unified';
import markdown from 'remark-parse-no-trim';
import { some, filter, uniq } from 'lodash';
import deepEqual from 'fast-deep-equal';
import type { ECSMappingOrUndefined } from '@kbn/osquery-io-ts-types';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import { createLiveQueryRequestBodySchema } from '../../../common/api';
import { API_VERSIONS, OSQUERY_MAX_AGENTS_HEADER } from '../../../common/constants';
import { PARAMETER_NOT_FOUND } from '../../../common/translations/errors';
import { replaceParamsQuery } from '../../../common/utils/replace_params_query';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { StartPlugins } from '../../types';
import { createActionHandler } from '../../handlers';
import { CustomHttpRequestError } from '../../common/error';
import { parser as OsqueryParser } from './osquery_parser';
import { getUserInfo } from '../../lib/get_user_info';
import type { AuthorizeOsqueryResponseActionResult } from '../../lib/check_response_action_authz';
import {
  getOsqueryCapabilities,
  authorizeOsqueryResponseAction,
} from '../../lib/check_response_action_authz';
import { createLiveQueryResponseSchema } from './response_schemas';
import { toEcsMappingRecord } from '../../lib/resolve_query_reference';
import type { DispatchSource } from '../../handlers/action/dispatch_source';
import { resolveWorkflowOrigin } from '../../handlers/action/action_origin';

// AlertsClient.get wraps every lookup failure (missing alert, alert-level authorization,
// Elasticsearch errors) in Boom.notFound, so a missing alert cannot be told apart from one the
// caller cannot read. Both get the same message, which also avoids revealing whether it exists.
const alertNotAccessible = (id: string) => `Alert "${id}" was not found or is not accessible`;

// Returns the ids that do not resolve to an alert the caller can read. `ids` matches `_id`
// literally, and the client ANDs the caller's authorization and space filters into the query.
// `size` bounds documents, not distinct ids, and the same `_id` can exist in several alert
// indices. A full page may therefore hide other ids, so the ids still missing are searched again
// until a page comes back short. Every round resolves at least one id, so the loop ends.
const findUnreadableAlertIds = async (
  client: PublicMethodsOf<AlertsClient>,
  ids: string[]
): Promise<string[]> => {
  let missing = ids;

  while (missing.length) {
    const { hits } = await client.find({
      query: { ids: { values: missing } },
      size: missing.length,
      _source: false,
    });
    const readable = new Set(hits.hits.map((hit) => hit._id));
    const stillMissing = missing.filter((id) => !readable.has(id));

    if (hits.hits.length < missing.length || stillMissing.length === missing.length) {
      return stillMissing;
    }

    missing = stillMissing;
  }

  return missing;
};

export const createLiveQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/osquery/live_queries',
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization depends on the request body; see authorizeOsqueryResponseAction.',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidation<
              typeof createLiveQueryRequestBodySchema,
              CreateLiveQueryRequestBodySchema
            >(createLiveQueryRequestBodySchema),
          },
          response: {
            200: {
              body: () => createLiveQueryResponseSchema,
            },
          },
        },
      },
      async (context, request, response) => {
        const [coreStartServices, startPlugins] = await osqueryContext.getStartServices();

        const logger = osqueryContext.logFactory.get('liveQuery');

        // alert_ids is capped at MAX_DISTINCT_ALERT_IDS distinct ids by the request schema.
        const [primaryAlertId, ...otherAlertIds] = uniq(request.body.alert_ids);

        let alertsClient: PublicMethodsOf<AlertsClient> | undefined;
        let alertData: (ParsedTechnicalFields & { _index: string }) | undefined;
        let alertError: { statusCode: number; message: string } | undefined;
        try {
          if (primaryAlertId) {
            alertsClient = await osqueryContext.service
              .getRuleRegistryService()
              ?.getRacClientWithRequest(request);

            if (!alertsClient) {
              throw new Error('Alert client unavailable');
            }

            // Only the first alert feeds authorization; the others are checked once the caller
            // is authorized, so a caller without osquery privileges costs a single lookup.
            alertData = (await alertsClient.get({
              id: primaryAlertId,
            })) as ParsedTechnicalFields & {
              _index: string;
            };
          }
        } catch (error) {
          if (transformError(error).statusCode === 404) {
            alertError = { statusCode: 404, message: alertNotAccessible(primaryAlertId) };
          } else {
            logger.error(
              `Failed to retrieve alert for osquery live query request: ${
                error instanceof Error ? error.message : String(error)
              }`,
              {
                error,
              }
            );
            alertError = { statusCode: 500, message: 'Error occurred while retrieving the alert' };
          }
        }

        // Space, capabilities, and reference resolution all read ES/SO. A transient failure
        // must not escape as an unhandled rejection on a request that only asked for an authz
        // decision.
        let space: { id: string } | undefined;
        let writeLiveQueries: boolean;
        let runSavedQueries: boolean;
        let authorization: AuthorizeOsqueryResponseActionResult;
        try {
          space = await osqueryContext.service.getActiveSpace(request);
          ({ writeLiveQueries, runSavedQueries } = await getOsqueryCapabilities(
            coreStartServices,
            request
          ));
          authorization = await authorizeOsqueryResponseAction(
            coreStartServices,
            request,
            {
              saved_query_id: request.body.saved_query_id,
              pack_id: request.body.pack_id,
              query: request.body.query,
              queries: request.body.queries,
              ecs_mapping: request.body.ecs_mapping,
            },
            space?.id,
            alertData
          );
        } catch (error) {
          logger.error(`Failed to authorize osquery live query request: ${error.message}`, {
            error,
          });

          return response.customError({
            statusCode: 500,
            body: new Error('Error occurred while authorizing the live query request'),
          });
        }

        const { resolved } = authorization;
        const isInvalid = !authorization.authorized;

        if (isInvalid) {
          // Investigation-guide match requires runSavedQueries; it is not a grant of its own.
          if (!runSavedQueries || !request.body.alert_ids?.length || alertError) {
            return response.forbidden();
          }

          // Recovery only ever vouches for the singular `query`. A `queries[]` alongside it
          // would be dispatched unchecked by createDynamicQueries, so fail closed here.
          if (request.body.queries?.length) {
            return response.forbidden();
          }

          // Investigation guides embed inline SQL and never name a pack or saved query. A denied
          // reference must not be recovered here, or the action document would attribute the run
          // to an object the caller cannot read.
          if (request.body.pack_id?.trim() || request.body.saved_query_id?.trim()) {
            return response.forbidden();
          }

          try {
            const justifyingAlert = alertData;
            const investigationGuide = justifyingAlert?.['kibana.alert.rule.note'];

            if (!justifyingAlert || !investigationGuide) {
              return response.forbidden();
            }

            const parsedAlertInvestigationGuide = unified()
              .use([[markdown, {}], OsqueryParser])
              .parse(investigationGuide);

            const osqueryQueries = filter(parsedAlertInvestigationGuide?.children as object, [
              'type',
              'osquery',
            ]);

            const requestQueryExistsInTheInvestigationGuide = some(
              osqueryQueries,
              (payload: {
                configuration: { query: string; ecs_mapping: ECSMappingOrUndefined };
              }) => {
                const { result: replacedConfigurationQuery } = replaceParamsQuery(
                  payload.configuration.query,
                  justifyingAlert
                );

                return (
                  replacedConfigurationQuery === request.body.query &&
                  deepEqual(
                    toEcsMappingRecord(payload.configuration.ecs_mapping),
                    toEcsMappingRecord(request.body.ecs_mapping)
                  )
                );
              }
            );

            if (!requestQueryExistsInTheInvestigationGuide) throw new Error();
          } catch (error) {
            return response.forbidden();
          }
        } else if (alertError) {
          return response.customError({
            statusCode: alertError.statusCode,
            body: { message: alertError.message },
          });
        }

        // The caller is authorized. Every other referenced alert must resolve too, so an action
        // cannot be attached to an alert the caller cannot read.
        if (alertsClient && otherAlertIds.length) {
          try {
            const [firstUnreadableId] = await findUnreadableAlertIds(alertsClient, otherAlertIds);

            if (firstUnreadableId !== undefined) {
              return response.customError({
                statusCode: 404,
                body: { message: alertNotAccessible(firstUnreadableId) },
              });
            }
          } catch (error) {
            // find() wraps lookup failures in a 404 without saying which id caused them.
            if (transformError(error).statusCode === 404) {
              return response.customError({
                statusCode: 404,
                body: { message: 'An alert was not found or is not accessible' },
              });
            }

            logger.error(
              `Failed to retrieve alerts for osquery live query request: ${
                error instanceof Error ? error.message : String(error)
              }`,
              { error }
            );

            return response.customError({
              statusCode: 500,
              body: { message: 'Error occurred while retrieving the alert' },
            });
          }
        }

        try {
          const securityStart = (startPlugins as StartPlugins).security;
          const currentUser = await getUserInfo({
            request,
            security: securityStart,
            logger,
          });
          const username = currentUser?.username ?? undefined;
          const userProfileUid = currentUser?.profile_uid ?? undefined;

          // Build the dispatch source once after authorization.
          let liveDispatchSource: Exclude<DispatchSource, { kind: 'unresolved' }>;
          if (writeLiveQueries) {
            liveDispatchSource = { kind: 'caller' };
          } else if (isInvalid) {
            // investigation_guide recovery path
            liveDispatchSource = { kind: 'investigation_guide' };
          } else if (resolved?.isPack) {
            liveDispatchSource = { kind: 'pack', packSavedObjectId: resolved.savedObjectId };
          } else if (resolved) {
            liveDispatchSource = {
              kind: 'saved_query',
              savedQueryId: request.body.saved_query_id?.trim() ?? '',
              stored: resolved,
            };
          } else {
            liveDispatchSource = { kind: 'caller' };
          }

          // Only the workflow steps send the header; it does nothing while they are off.
          const maxAgents = osqueryContext.experimentalFeatures.workflowsExtensionsEnabled
            ? maxAgentsFromHeader(request.headers[OSQUERY_MAX_AGENTS_HEADER])
            : undefined;
          if (maxAgents === null) {
            return response.badRequest({
              body: `${OSQUERY_MAX_AGENTS_HEADER} must be a positive integer`,
            });
          }

          // Any workflow run that calls this route is recorded, whether it comes from an osquery
          // step or a generic `kibana.request` step. The execution ID is not verified: any
          // internal-origin caller that sends the header is recorded as Workflow (attribution only).
          const origin = osqueryContext.experimentalFeatures.workflowsExtensionsEnabled
            ? resolveWorkflowOrigin(request)
            : undefined;

          const { response: osqueryAction, fleetActionsCount } = await createActionHandler(
            osqueryContext,
            request.body,
            {
              metadata: { currentUser: username, userProfileUid },
              alertData,
              space,
              dispatch: { entryPoint: 'live_query', source: liveDispatchSource },
              maxAgents,
              ...(origin ? { origin } : {}),
            }
          );

          if (!fleetActionsCount) {
            // Return the first errored row's message rather than always PARAMETER_NOT_FOUND.
            const firstError = (osqueryAction.queries as Array<{ error?: string }>)?.[0]?.error;

            return response.badRequest({
              body: firstError ?? PARAMETER_NOT_FOUND,
            });
          }

          return response.ok({
            body: { data: osqueryAction },
          });
        } catch (error) {
          if (error.statusCode === 400) {
            return response.badRequest({
              body:
                error instanceof CustomHttpRequestError && error.code
                  ? { message: error.message, attributes: { code: error.code } }
                  : error,
            });
          }

          return response.customError({
            statusCode: 500,
            body: new Error(`Error occurred while processing ${error}`),
          });
        }
      }
    );
};

/**
 * The ceiling the workflow step sends: a positive integer, `undefined` when the header is absent
 * and `null` when it is present but invalid. Node joins a repeated header into `"5, 9"`; the
 * smallest value wins so a duplicate can only tighten the ceiling.
 */
export const maxAgentsFromHeader = (
  header: string | string[] | undefined
): number | undefined | null => {
  if (header === undefined) return undefined;

  const values = (Array.isArray(header) ? header : [header])
    .flatMap((value) => value.split(','))
    .map((value) => value.trim());
  if (values.length === 0 || !values.every((value) => /^[1-9][0-9]{0,6}$/.test(value))) {
    return null;
  }

  return Math.min(...values.map(Number));
};
