/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const getGapFillAutoSchedulerLogsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: '/internal/alerting/rules/gaps/auto_fill_scheduler/{id}/logs',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        query: schema.object({
          start: schema.maybe(schema.string()),
          end: schema.maybe(schema.string()),
          page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
          perPage: schema.maybe(schema.number({ defaultValue: 50, min: 1, max: 1000 })),
          sort: schema.maybe(
            schema.arrayOf(
              schema.object({
                field: schema.string(),
                direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
              })
            )
          ),
          filter: schema.maybe(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          const { id } = req.params;
          const { start, end, page = 1, perPage = 50, sort, filter } = req.query;
          const taskId = `${id}`;

          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();

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

          return res.ok({
            body: {
              data: result.data,
              total: result.total,
              page,
              perPage,
            },
          });
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
