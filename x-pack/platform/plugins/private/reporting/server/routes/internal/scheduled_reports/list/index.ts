/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import type { ReportingCore } from '../../../..';
import {
  DEFAULT_SCHEDULED_REPORT_LIST_SIZE,
  MAX_SCHEDULED_REPORT_LIST_SIZE,
  ScheduledReportsService,
} from '../../../../services/scheduled_reports';
import type { ReportingPluginRouter } from '../../../../types';
import { authorizedUserPreRouting, getCounters } from '../../../common';
import { handleUnavailable } from '../../../common/request_handler';
import { validateReportingLicense } from '../utils';

const { SCHEDULED } = INTERNAL_ROUTES;

export const registerInternalListRoute = ({
  logger,
  router,
  reporting,
}: {
  logger: Logger;
  router: ReportingPluginRouter;
  reporting: ReportingCore;
}) => {
  // list scheduled jobs in the queue, paginated
  const path = SCHEDULED.LIST;
  router.get(
    {
      path,
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because reporting uses its own authorization model.',
        },
      },
      validate: {
        query: schema.object({
          search: schema.maybe(schema.string({ maxLength: 1000 })),
          page: schema.string({ defaultValue: '1' }),
          size: schema.string({
            defaultValue: `${DEFAULT_SCHEDULED_REPORT_LIST_SIZE}`,
            validate: (value: string) => {
              try {
                const size = parseInt(value, 10);
                if (size < 1 || size > MAX_SCHEDULED_REPORT_LIST_SIZE) {
                  return `size must be between 1 and ${MAX_SCHEDULED_REPORT_LIST_SIZE}: size: ${value}`;
                }
              } catch (e) {
                return `size must be an integer: size: ${value}`;
              }
            },
          }),
        }),
      },
      options: { access: 'internal' },
    },
    authorizedUserPreRouting(reporting, async (user, context, req, res) => {
      try {
        const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

        // ensure the async dependencies are loaded
        if (!context.reporting) {
          return handleUnavailable(res);
        }

        await validateReportingLicense({ reporting, responseFactory: res });

        const {
          page: queryPage = '1',
          size: querySize = `${DEFAULT_SCHEDULED_REPORT_LIST_SIZE}`,
          search,
        } = req.query;
        const page = parseInt(queryPage, 10) || 1;
        const size = Math.min(
          MAX_SCHEDULED_REPORT_LIST_SIZE,
          parseInt(querySize, 10) || DEFAULT_SCHEDULED_REPORT_LIST_SIZE
        );

        const scheduledReportsService = await ScheduledReportsService.build({
          logger,
          reportingCore: reporting,
          request: req,
          responseFactory: res,
        });

        const results = await scheduledReportsService.list({ user, page, size, search });

        counters.usageCounter();

        return res.ok({ body: results, headers: { 'content-type': 'application/json' } });
      } catch (err) {
        if (err instanceof KibanaResponse) {
          return err;
        }
        throw err;
      }
    })
  );
};
