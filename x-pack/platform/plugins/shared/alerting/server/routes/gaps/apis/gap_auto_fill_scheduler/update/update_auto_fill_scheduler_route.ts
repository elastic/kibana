/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { UpdateGapAutoFillSchedulerResponseV1 } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import { updateGapAutoFillSchema } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../../types';
import { transformRequestV1, transformResponseV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export const updateAutoFillSchedulerRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.put(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/gaps/gap_auto_fill_scheduler/{id}`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: updateGapAutoFillSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();

        try {
          const updatedSo = await rulesClient.updateGapFillAutoScheduler(transformRequestV1(req));
          const response: UpdateGapAutoFillSchedulerResponseV1 = {
            body: transformResponseV1(updatedSo),
          };
          return res.ok(response);
        } catch (error) {
          if (error?.output?.statusCode === 404) {
            return res.notFound({
              body: { message: `Scheduler with id ${req.params.id} not found` },
            });
          }
          return res.customError({
            statusCode: 500,
            body: { message: error.message || 'Error updating scheduler' },
          });
        }
      })
    )
  );
};
