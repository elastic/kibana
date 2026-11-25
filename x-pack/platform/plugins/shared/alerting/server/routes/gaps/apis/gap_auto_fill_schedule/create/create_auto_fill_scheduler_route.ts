/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter, RouteConfigOptions, RouteMethod } from '@kbn/core/server';
import type { GapAutoFillSchedulerResponseV1 } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import {
  createGapAutoFillSchedulerExamplesV1,
  gapAutoFillSchedulerBodySchemaV1,
  gapAutoFillSchedulerResponseSchemaV1,
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

interface BuildCreateAutoFillSchedulerRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  options: RouteConfigOptions<RouteMethod>;
}

const buildCreateAutoFillSchedulerRoute = ({
  licenseState,
  path,
  router,
  options,
}: BuildCreateAutoFillSchedulerRouteParams) => {
  router.post(
    {
      path,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options,
      validate: {
        request: {
          body: gapAutoFillSchedulerBodySchemaV1,
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
          409: {
            description:
              'Indicates a gap auto fill scheduler with the given ID, or for one of the given rule type and consumer pairs, already exists.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForGapAutoFillScheduler();

        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const result = await rulesClient.createGapAutoFillScheduler(transformRequestV1(req));
        const response: GapAutoFillSchedulerResponseV1 = {
          body: transformToGapAutoFillSchedulerResponseBodyV1(result),
        };
        return res.ok(response);
      })
    )
  );
};

export const createAutoFillSchedulerRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildCreateAutoFillSchedulerRoute({
    licenseState,
    path: INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH,
    router,
    options: { access: 'internal' },
  });

export const createAutoFillSchedulerPublicRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildCreateAutoFillSchedulerRoute({
    licenseState,
    path: ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH,
    router,
    options: {
      access: 'public',
      summary: 'Create a gap auto fill scheduler',
      description:
        'Create a gap auto fill scheduler that periodically fills detected gaps for the given rule types in the Kibana space of the request. Only one scheduler can exist per rule type and consumer pair. To manage the automatic gap filling setting shown in the Elastic Security detection rules settings, use the ID `security-solution-gap-auto-fill-scheduler-<space-id>`. This API requires an Enterprise license.',
      tags: ['oas-tag:alerting'],
      oasOperationObject: createGapAutoFillSchedulerExamplesV1,
    },
  });
