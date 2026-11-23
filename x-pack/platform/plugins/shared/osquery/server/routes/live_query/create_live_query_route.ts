/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { isBoom, notFound } from '@hapi/boom';
import unified from 'unified';
import markdown from 'remark-parse-no-trim';
import { some, filter } from 'lodash';
import deepEqual from 'fast-deep-equal';
import type { ECSMappingOrUndefined } from '@kbn/osquery-io-ts-types';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import { createLiveQueryRequestBodySchema } from '../../../common/api';
import { API_VERSIONS } from '../../../common/constants';
import { PARAMETER_NOT_FOUND } from '../../../common/translations/errors';
import { replaceParamsQuery } from '../../../common/utils/replace_params_query';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { StartPlugins } from '../../types';
import { createActionHandler } from '../../handlers';
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

        let alertData: (ParsedTechnicalFields & { _index: string }) | undefined;
        let alertError: { statusCode: number; message: string } | undefined;
        try {
          if (request.body.alert_ids?.length) {
            const client = await osqueryContext.service
              .getRuleRegistryService()
              ?.getRacClientWithRequest(request);

            if (!client) {
              throw new Error('Alert client unavailable');
            }

            // Every referenced alert must resolve; the first one drives the rest of the request.
            // The alerts client reports both missing and unauthorized alerts as a Boom 404.
            const alerts = await Promise.all(
              request.body.alert_ids.map(async (id) => {
                const alert = await client.get({ id });
                if (!alert) {
                  throw notFound();
                }

                return alert as ParsedTechnicalFields & { _index: string };
              })
            );

            alertData = alerts[0];
          }
        } catch (error) {
          const rawStatusCode = isBoom(error)
            ? error.output.statusCode
            : error?.statusCode ?? error?.meta?.statusCode;
          const statusCode = typeof rawStatusCode === 'number' ? rawStatusCode : undefined;

          if (statusCode === 404 || statusCode === 403) {
            alertError = {
              statusCode: 404,
              message: 'The requested alert was not found or is not accessible',
            };
          } else {
            logger.error(
              `Failed to retrieve alert for osquery live query request: ${error.message}`,
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

          const { response: osqueryAction, fleetActionsCount } = await createActionHandler(
            osqueryContext,
            request.body,
            {
              metadata: { currentUser: username, userProfileUid },
              alertData,
              space,
              dispatch: { entryPoint: 'live_query', source: liveDispatchSource },
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
            return response.badRequest({ body: error });
          }

          return response.customError({
            statusCode: 500,
            body: new Error(`Error occurred while processing ${error}`),
          });
        }
      }
    );
};
