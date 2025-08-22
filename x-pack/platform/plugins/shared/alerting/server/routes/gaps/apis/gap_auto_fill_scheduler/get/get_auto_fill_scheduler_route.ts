/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { GapAutoFillSchedulerResponseV1 } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../../types';
import { transformRequestV1, transformResponseV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export const getAutoFillSchedulerRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/gaps/gap_auto_fill_scheduler/{id}`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { id } = req.params as { id: string };
        try {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();
          const result = await rulesClient.getGapFillAutoScheduler(transformRequestV1(id));
          const response: GapAutoFillSchedulerResponseV1 = {
            body: transformResponseV1(result),
          };
          return res.ok(response);
        } catch (error) {
          if (error?.output?.statusCode === 404)
            return res.notFound({ body: { message: `Scheduler with id ${id} not found` } });
          return res.customError({
            statusCode: 500,
            body: { message: error.message || 'Error fetching scheduler info' },
          });
        }
      })
    )
  );
};
