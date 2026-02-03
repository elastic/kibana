/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import type { ReportingCore } from '../../../..';
import { ScheduledReportsService } from '../../../../services/scheduled_reports';
import type { ReportingPluginRouter } from '../../../../types';
import { authorizedUserPreRouting, getCounters } from '../../../common';
import { handleUnavailable } from '../../../common/request_handler';
import { validateReportingLicense } from '../utils';
import { updateScheduledReportBodySchema, updateScheduledReportParamsSchema } from './schemas';

const { SCHEDULE_PREFIX } = INTERNAL_ROUTES;
const path = `${SCHEDULE_PREFIX}/{id}`;

export const registerInternalUpdateScheduledReportRoute = ({
  logger,
  router,
  reporting,
}: {
  logger: Logger;
  router: ReportingPluginRouter;
  reporting: ReportingCore;
}) => {
  router.put(
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
        params: updateScheduledReportParamsSchema,
        body: updateScheduledReportBodySchema,
      },
      options: { access: 'internal' },
    },
    authorizedUserPreRouting(reporting, async (user, context, request, responseFactory) => {
      try {
        // ensure the async dependencies are loaded
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

        const results = await scheduledReportsService.update({
          user,
          id,
          updateParams: request.body,
        });

        counters.usageCounter();

        return responseFactory.ok({
          body: results,
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
