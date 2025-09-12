/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { GapAutoFillSchedulerLogsResponseV1 } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler_logs';
import { autoFillSchedulerLogsQuerySchemaV1 } from '../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler_logs';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../../types';
import { transformRequestV1, transformResponseV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export const getGapFillAutoSchedulerLogsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/gaps/gap_auto_fill_scheduler/{id}/logs`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        query: autoFillSchedulerLogsQuerySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          const { id } = req.params as { id: string };
          const query = req.query;
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();

          const { start, end, page, perPage, sort, filter } = transformRequestV1(query);

          const result = await rulesClient.getGapFillAutoSchedulerLogs({
            id,
            start,
            end,
            page,
            perPage,
            sort,
            filter,
          });

          const response: GapAutoFillSchedulerLogsResponseV1 = {
            body: transformResponseV1(result),
          };

          return res.ok(response);
        } catch (error) {
          if (error?.output?.statusCode === 404) {
            return res.notFound({
              body: { message: `Gap fill auto scheduler with id ${req.params.id} not found` },
            });
          }
          return res.customError({
            statusCode: error?.output?.statusCode || 500,
            body: { message: error.message || 'Error fetching gap fill event logs' },
          });
        }
      })
    )
  );
};
