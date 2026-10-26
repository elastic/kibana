/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import type { GapAutoFillSchedulerLogsResponseV1 } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import {
  findGapAutoFillSchedulerLogsParamsSchemaV1,
  gapAutoFillSchedulerLogsRequestQuerySchemaV1,
} from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH } from '../../../../../types';
import { transformRequestV1, transformResponseV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export const findAutoFillSchedulerLogsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_GAPS_AUTO_FILL_SCHEDULER_API_PATH}/{id}/logs`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: findGapAutoFillSchedulerLogsParamsSchemaV1,
        body: gapAutoFillSchedulerLogsRequestQuerySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForGapAutoFillScheduler();

        const { id } = req.params as { id: string };
        const body = req.body;
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();

        const params = transformRequestV1(id, body);

        const result = await rulesClient.findGapAutoFillSchedulerLogs(params);

        const response: GapAutoFillSchedulerLogsResponseV1 = {
          body: transformResponseV1(result),
        };

        return res.ok(response);
      })
    )
  );
};
