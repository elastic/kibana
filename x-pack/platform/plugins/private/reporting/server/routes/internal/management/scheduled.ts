/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { ReportingCore } from '../../..';
import { authorizedUserPreRouting, getCounters } from '../../common';
import { handleUnavailable } from '../../common/request_handler';
import { scheduledQueryFactory } from '../../common/scheduled';

const { SCHEDULED } = INTERNAL_ROUTES;

export function registerScheduledRoutesInternal(reporting: ReportingCore) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;
  const scheduledQuery = scheduledQueryFactory(reporting, { isInternal: true });

  const registerInternalGetList = () => {
    // list scheduled jobs in the queue, paginated
    const path = SCHEDULED.LIST;
    router.get(
      {
        path,
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {
          query: schema.object({
            page: schema.string({ defaultValue: '1' }),
            size: schema.string({ defaultValue: '10' }),
          }),
        },
        options: { access: 'internal' },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

        // ensure the async dependencies are loaded
        if (!context.reporting) {
          return handleUnavailable(res);
        }

        const { page: queryPage = '1', size: querySize = '10' } = req.query;
        const page = parseInt(queryPage, 10) || 1;
        const size = Math.min(100, parseInt(querySize, 10) || 10);
        const results = await scheduledQuery.list(req, user, page, size);

        counters.usageCounter();

        return res.ok({
          body: results,
          headers: {
            'content-type': 'application/json',
          },
        });
      })
    );
  };

  // // use common route handlers that are shared for public and internal routes
  // const jobHandlers = commonJobsRouteHandlerFactory(reporting, { isInternal: true });

  // const registerInternalDisableScheduledReport = () => {
  //   // allow a scheduled report to be disabled
  //   const path = `${SCHEDULED.DISABLE_PREFIX}/{docId}`;

  //   router.get(
  //     {
  //       path,
  //       security: {
  //         authz: {
  //           enabled: false,
  //           reason: 'This route is opted out from authorization',
  //         },
  //       },
  //       validate: jobHandlers.validate,
  //       options: { access: 'internal' },
  //     },
  //     authorizedUserPreRouting(reporting, async (user, context, req, res) => {
  //       return jobHandlers.handleDeleteReport({ path, user, context, req, res });
  //     })
  //   );
  // };

  registerInternalGetList();
  // registerInternalDisableScheduledReport();
}
