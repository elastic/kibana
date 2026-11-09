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

const path = INTERNAL_ROUTES.SCHEDULED.RUN;

export const registerInternalRunScheduledReportRoute = ({
  logger,
  router,
  reporting,
}: {
  logger: Logger;
  router: ReportingPluginRouter;
  reporting: ReportingCore;
}) => {
  router.post(
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
        params: schema.object({
          id: schema.string({ minLength: 1, maxLength: 1000 }),
        }),
      },
      options: { access: 'internal' },
    },
    authorizedUserPreRouting(reporting, async (user, context, request, responseFactory) => {
      try {
        if (!context.reporting) {
          return handleUnavailable(responseFactory);
        }

        await validateReportingLicense({ reporting, responseFactory });

        const { id } = request.params;

        const counters = getCounters(request.route.method, path, reporting.getUsageCounter());
        const scheduledReportsService = await ScheduledReportsService.build({
          logger,
          reportingCore: reporting,
          request,
          responseFactory,
        });

        const result = await scheduledReportsService.runNow({ user, id });

        counters.usageCounter();

        return responseFactory.ok({
          body: result,
          headers: { 'content-type': 'application/json' },
        });
      } catch (err) {
        if (err instanceof KibanaResponse) {
          return err;
        }
        throw err;
      }
    })
  );
};
