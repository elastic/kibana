/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RouteConfigOptions, RouteMethod } from '@kbn/core/server';
import { mapSettledResponses } from '@kbn/cck-plugin/common';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { ruleResponseSchemaV1 } from '../../../../../common/routes/rule/response';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { BASE_ALERTING_API_PATH, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';

import { getRuleRequestParamsSchemaV1 } from '../../../../../common/routes/rule/apis/get';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

interface BuildGetRulesRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  excludeFromPublicApi?: boolean;
  options?: RouteConfigOptions<RouteMethod>;
}
const buildGetRuleRoute = ({
  licenseState,
  path,
  router,
  excludeFromPublicApi = false,
  options,
}: BuildGetRulesRouteParams) => {
  router.get(
    {
      path,
      options,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      validate: {
        request: {
          params: getRuleRequestParamsSchemaV1,
        },
        response: {
          200: {
            body: () => ruleResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
          404: {
            description: 'Indicates a rule with the given ID does not exist.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const cckClient = alertingContext.cckClientGetter();

        const responses = await cckClient.request(
          'GET',
          path.replace('{id}', req.params.id).replace('/_remote', '')
        );
        return res.ok({
          body: Object.fromEntries(
            mapSettledResponses(
              responses,
              (response, server) => {
                return [server, response];
              },
              (error, server) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return [server, { error } as any];
              }
            )
          ),
        });
      })
    )
  );
};

export const getRemoteRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetRuleRoute({
    excludeFromPublicApi: true,
    licenseState,
    path: `${BASE_ALERTING_API_PATH}/rule/{id}/_remote`,
    router,
    options: {
      access: 'public',
      summary: `Get rule details`,
      tags: ['oas-tag:alerting'],
    },
  });

export const getRemoteInternalRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetRuleRoute({
    excludeFromPublicApi: false,
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_remote`,
    router,
    options: { access: 'internal' },
  });
