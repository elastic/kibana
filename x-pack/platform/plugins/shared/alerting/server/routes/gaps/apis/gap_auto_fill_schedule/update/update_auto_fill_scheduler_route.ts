/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter, RouteConfigOptions, RouteMethod } from '@kbn/core/server';
import type { GapAutoFillSchedulerResponseV1 } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import {
  gapAutoFillSchedulerResponseSchemaV1,
  gapAutoFillSchedulerUpdateBodySchemaV1,
  getGapAutoFillSchedulerParamsSchemaV1,
  updateGapAutoFillSchedulerExamplesV1,
} from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import {
  ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH,
  INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH,
} from '../../../../../types';
import { transformToGapAutoFillSchedulerResponseBodyV1 } from '../transforms/transform_response';
import { transformRequestV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

interface BuildUpdateAutoFillSchedulerRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  options: RouteConfigOptions<RouteMethod>;
}

const buildUpdateAutoFillSchedulerRoute = ({
  licenseState,
  path,
  router,
  options,
}: BuildUpdateAutoFillSchedulerRouteParams) => {
  router.put(
    {
      path,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options,
      validate: {
        request: {
          params: getGapAutoFillSchedulerParamsSchemaV1,
          body: gapAutoFillSchedulerUpdateBodySchemaV1,
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
          409: {
            description:
              'Indicates another gap auto fill scheduler already exists for one of the given rule type and consumer pairs.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForGapAutoFillScheduler();

        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const result = await rulesClient.updateGapAutoFillScheduler(transformRequestV1(req));
        const response: GapAutoFillSchedulerResponseV1 = {
          body: transformToGapAutoFillSchedulerResponseBodyV1(result),
        };
        return res.ok(response);
      })
    )
  );
};

export const updateAutoFillSchedulerRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildUpdateAutoFillSchedulerRoute({
    licenseState,
    path: `${INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH}/{id}`,
    router,
    options: { access: 'internal' },
  });

export const updateAutoFillSchedulerPublicRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildUpdateAutoFillSchedulerRoute({
    licenseState,
    path: `${ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH}/{id}`,
    router,
    options: {
      access: 'public',
      summary: 'Update a gap auto fill scheduler by ID',
      description:
        'Replace the configuration of a gap auto fill scheduler. The request body must contain the full configuration. Set `enabled` to `true` to turn automatic gap filling on and to `false` to turn it off. The call is idempotent: repeating it with the same body leaves the scheduler in the same state.',
      tags: ['oas-tag:alerting'],
      oasOperationObject: updateGapAutoFillSchedulerExamplesV1,
    },
  });
