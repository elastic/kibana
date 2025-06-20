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
import { ReportingCore } from '../../..';
import { authorizedUserPreRouting, getCounters } from '../../common';
import { handleUnavailable } from '../../common/request_handler';
import { scheduledQueryFactory } from '../../common/scheduled';
import {
  DEFAULT_SCHEDULED_REPORT_LIST_SIZE,
  MAX_SCHEDULED_REPORT_LIST_SIZE,
} from '../../common/scheduled/scheduled_query';

const { SCHEDULED } = INTERNAL_ROUTES;

export function registerScheduledRoutesInternal(reporting: ReportingCore, logger: Logger) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;
  const scheduledQuery = scheduledQueryFactory(reporting);

  const registerInternalGetList = () => {
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

          // check license
          const licenseInfo = await reporting.getLicenseInfo();
          const licenseResults = licenseInfo.scheduledReports;

          if (!licenseResults.enableLinks) {
            return res.forbidden({ body: licenseResults.message });
          }

          const {
            page: queryPage = '1',
            size: querySize = `${DEFAULT_SCHEDULED_REPORT_LIST_SIZE}`,
          } = req.query;
          const page = parseInt(queryPage, 10) || 1;
          const size = Math.min(
            MAX_SCHEDULED_REPORT_LIST_SIZE,
            parseInt(querySize, 10) || DEFAULT_SCHEDULED_REPORT_LIST_SIZE
          );
          const results = await scheduledQuery.list(logger, req, res, user, page, size);

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

  const registerInternalPatchBulkDisable = () => {
    // allow scheduled reports to be disabled
    const path = SCHEDULED.BULK_DISABLE;

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

          // check license
          const licenseInfo = await reporting.getLicenseInfo();
          const licenseResults = licenseInfo.scheduledReports;

          if (!licenseResults.enableLinks) {
            return res.forbidden({ body: licenseResults.message });
          }

          const { ids } = req.body;

          const results = await scheduledQuery.bulkDisable(logger, req, res, ids, user);

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

  registerInternalGetList();
  registerInternalPatchBulkDisable();
}
