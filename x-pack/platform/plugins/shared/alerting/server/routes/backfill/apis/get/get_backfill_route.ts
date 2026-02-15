/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter, RouteConfigOptions, RouteMethod } from '@kbn/core/server';
import type {
  GetBackfillRequestParamsV1,
  GetBackfillResponseV1,
} from '../../../../../common/routes/backfill/apis/get';
import { getParamsSchemaV1 } from '../../../../../common/routes/backfill/apis/get';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH, ALERTING_BACKFILL_API_PATH } from '../../../../types';
import { transformBackfillToBackfillResponseV1 } from '../../transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

interface BuildGetBackfillRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  options: RouteConfigOptions<RouteMethod>;
}

const buildGetBackfillRoute = ({
  licenseState,
  path,
  router,
  options,
}: BuildGetBackfillRouteParams) => {
  router.get(
    {
      path,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options,
      validate: {
        params: getParamsSchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const params: GetBackfillRequestParamsV1 = req.params;

        const result = await rulesClient.getBackfill(params.id);
        const response: GetBackfillResponseV1 = {
          body: transformBackfillToBackfillResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};

export const getBackfillRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetBackfillRoute({
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/backfill/{id}`,
    router,
    options: { access: 'internal' },
  });

export const getBackfillPublicRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetBackfillRoute({
    licenseState,
    path: `${ALERTING_BACKFILL_API_PATH}/{id}`,
    router,
    options: {
      access: 'public',
      summary: 'Get a backfill by ID',
      tags: ['oas-tag:alerting'],
    },
  });
