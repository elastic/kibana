/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import type { ReportingCore } from '../../../..';
import { ScheduledReportsService } from '../../../../services/scheduled_reports';
import type { ReportingPluginRouter } from '../../../../types';
import { authorizedUserPreRouting, getCounters } from '../../../common';
import { handleUnavailable } from '../../../common/request_handler';
import { validateReportingLicense } from '../utils';

const { SCHEDULED } = INTERNAL_ROUTES;

export const registerInternalBulkEnableRoute = ({
  logger,
  router,
  reporting,
}: {
  logger: Logger;
  router: ReportingPluginRouter;
  reporting: ReportingCore;
}) => {
  // allow scheduled reports to be enabled
  const path = SCHEDULED.BULK_ENABLE;

  router.patch(
    {
      path,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 1000 }),
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

        const { ids } = req.body;

        const scheduledReportsService = await ScheduledReportsService.build({
          logger,
          reportingCore: reporting,
          request: req,
          responseFactory: res,
        });

        const results = await scheduledReportsService.bulkEnable({ user, ids });

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
