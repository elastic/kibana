/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter, RouteConfigOptions, RouteMethod } from '@kbn/core/server';
import type {
  ScheduleBackfillRequestBodyV1,
  ScheduleBackfillResponseV1,
} from '../../../../../common/routes/backfill/apis/schedule';
import { scheduleBodySchemaV1 } from '../../../../../common/routes/backfill/apis/schedule';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import {
  INTERNAL_BASE_ALERTING_API_PATH,
  ALERTING_BACKFILL_SCHEDULE_API_PATH,
} from '../../../../types';
import { transformRequestV1, transformResponseV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

interface BuildScheduleBackfillRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  options: RouteConfigOptions<RouteMethod>;
}

const buildScheduleBackfillRoute = ({
  licenseState,
  path,
  router,
  options,
}: BuildScheduleBackfillRouteParams) => {
  router.post(
    {
      path,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options,
      validate: {
        body: scheduleBodySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const body: ScheduleBackfillRequestBodyV1 = req.body;

        const result = await rulesClient.scheduleBackfill(transformRequestV1(body));
        const response: ScheduleBackfillResponseV1 = {
          body: transformResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};

export const scheduleBackfillRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildScheduleBackfillRoute({
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/backfill/_schedule`,
    router,
    options: { access: 'internal' },
  });

export const scheduleBackfillPublicRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildScheduleBackfillRoute({
    licenseState,
    path: ALERTING_BACKFILL_SCHEDULE_API_PATH,
    router,
    options: {
      access: 'public',
      summary: 'Schedule a backfill for rules',
      tags: ['oas-tag:alerting'],
    },
  });
