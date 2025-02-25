/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import type { GetScheduleFrequencyResponseV1 } from '../../../../../common/routes/rule/apis/get_schedule_frequency';
import { transformGetScheduleFrequencyResultV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const getScheduleFrequencyRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_schedule_frequency`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {},
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async (context, req, res) => {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();

        const scheduleFrequencyResult = await rulesClient.getScheduleFrequency();

        const response: GetScheduleFrequencyResponseV1 = {
          body: transformGetScheduleFrequencyResultV1(scheduleFrequencyResult),
        };

        return res.ok(response);
      })
    )
  );
};
