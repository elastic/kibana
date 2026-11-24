/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter, RouteConfigOptions, RouteMethod } from '@kbn/core/server';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import {
  ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH,
  INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH,
} from '../../../../../types';
import { getGapAutoFillSchedulerParamsSchemaV1 } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { GetGapAutoFillSchedulerParamsV1 } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

interface BuildDeleteAutoFillSchedulerRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  options: RouteConfigOptions<RouteMethod>;
}

const buildDeleteAutoFillSchedulerRoute = ({
  licenseState,
  path,
  router,
  options,
}: BuildDeleteAutoFillSchedulerRouteParams) => {
  router.delete(
    {
      path,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options,
      validate: {
        request: {
          params: getGapAutoFillSchedulerParamsSchemaV1,
        },
        response: {
          204: {
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
          404: {
            description: 'Indicates a gap auto fill scheduler with the given ID does not exist.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForGapAutoFillScheduler();

        const params: GetGapAutoFillSchedulerParamsV1 = req.params;
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        await rulesClient.deleteGapAutoFillScheduler({ id: params.id });
        return res.noContent();
      })
    )
  );
};

export const deleteAutoFillSchedulerRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildDeleteAutoFillSchedulerRoute({
    licenseState,
    path: `${INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH}/{id}`,
    router,
    options: { access: 'internal' },
  });

export const deleteAutoFillSchedulerPublicRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildDeleteAutoFillSchedulerRoute({
    licenseState,
    path: `${ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH}/{id}`,
    router,
    options: {
      access: 'public',
      summary: 'Delete a gap auto fill scheduler by ID',
      description:
        'Delete a gap auto fill scheduler and stop its scheduled task. Automatic gap filling stops for the rule types the scheduler covered.',
      tags: ['oas-tag:alerting'],
    },
  });
