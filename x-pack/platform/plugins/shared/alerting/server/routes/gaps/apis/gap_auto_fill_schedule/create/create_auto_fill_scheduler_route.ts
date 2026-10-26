/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import type { GapAutoFillSchedulerResponseV1 } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import { gapAutoFillSchedulerBodySchemaV1 } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH } from '../../../../../types';
import { transformRequestV1 } from './transforms';
import { transformToGapAutoFillSchedulerResponseBodyV1 } from '../transforms/transform_response';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export const createAutoFillSchedulerRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        body: gapAutoFillSchedulerBodySchemaV1,
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
