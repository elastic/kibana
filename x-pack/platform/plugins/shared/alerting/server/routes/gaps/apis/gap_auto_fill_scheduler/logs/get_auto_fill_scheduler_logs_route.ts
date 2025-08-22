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
import { GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../../saved_objects';

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

          // Access the unsecuredSavedObjectsClient through the rulesClient context
          const soClient = (rulesClient as any).context.unsecuredSavedObjectsClient;

          // Resolve the scheduled task id from the scheduler SO
          const so = await soClient.get(GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE, id);
          const taskId = (so.attributes as { scheduledTaskId?: string }).scheduledTaskId || id;

          const { start, end, page, perPage, sort, filter } = transformRequestV1(query);

          // Build sort
          const sortOptions = sort || [{ field: '@timestamp', direction: 'desc' }];
          const formattedSort = sortOptions.map((s) => ({
            sort_field: s.field,
            sort_order: s.direction,
          }));

          const eventLogClient = await rulesClient.getEventLogClient();

          const result = await eventLogClient.findEventsBySavedObjectIds('task', [taskId], {
            page,
            per_page: perPage,
            start,
            end,
            sort: formattedSort,
            filter: filter
              ? `(${filter}) AND event.action:gap-fill-auto-schedule`
              : 'event.action:gap-fill-auto-schedule',
          });

          const response: GapAutoFillSchedulerLogsResponseV1 = {
            body: transformResponseV1({
              data: result.data,
              total: result.total,
              page,
              perPage,
            }),
          };

          return res.ok(response);
        } catch (error) {
          return res.customError({
            statusCode: 500,
            body: { message: error.message || 'Error fetching gap fill event logs' },
          });
        }
      })
    )
  );
};
