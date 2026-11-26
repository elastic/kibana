/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter, RouteConfigOptions, RouteMethod } from '@kbn/core/server';
import type {
  GapAutoFillSchedulerResponseV1,
  GetGapAutoFillSchedulerParamsV1,
} from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import {
  gapAutoFillSchedulerResponseSchemaV1,
  getGapAutoFillSchedulerExamplesV1,
  getGapAutoFillSchedulerParamsSchemaV1,
} from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import {
  ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH,
  INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH,
} from '../../../../../types';
import { transformRequestV1 } from './transforms';
import { transformToGapAutoFillSchedulerResponseBodyV1 } from '../transforms/transform_response';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

interface BuildGetAutoFillSchedulerRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  options: RouteConfigOptions<RouteMethod>;
}

const buildGetAutoFillSchedulerRoute = ({
  licenseState,
  path,
  router,
  options,
}: BuildGetAutoFillSchedulerRouteParams) => {
  router.get(
    {
      path,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options,
      validate: {
        request: {
          params: getGapAutoFillSchedulerParamsSchemaV1,
        },
        response: {
          200: {
            body: () => gapAutoFillSchedulerResponseSchemaV1,
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
        const result = await rulesClient.getGapAutoFillScheduler(transformRequestV1(params));
        const response: GapAutoFillSchedulerResponseV1 = {
          body: transformToGapAutoFillSchedulerResponseBodyV1(result),
        };
        return res.ok(response);
      })
    )
  );
};

export const getAutoFillSchedulerRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetAutoFillSchedulerRoute({
    licenseState,
    path: `${INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH}/{id}`,
    router,
    options: { access: 'internal' },
  });

export const getAutoFillSchedulerPublicRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetAutoFillSchedulerRoute({
    licenseState,
    path: `${ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH}/{id}`,
    router,
    options: {
      access: 'public',
      summary: 'Get a gap auto fill scheduler by ID',
      description:
        'Get the configuration of a gap auto fill scheduler, including whether automatic gap filling is enabled. Schedulers are scoped to the Kibana space of the request. The Elastic Security detection rules settings use the scheduler with the ID `security-solution-gap-auto-fill-scheduler-<space-id>`. This API requires an Enterprise license.',
      tags: ['oas-tag:alerting'],
      oasOperationObject: getGapAutoFillSchedulerExamplesV1,
    },
  });
