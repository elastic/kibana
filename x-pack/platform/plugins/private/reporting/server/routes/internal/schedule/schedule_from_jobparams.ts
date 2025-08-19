/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import type { Logger } from '@kbn/core/server';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import type { ReportingCore } from '../../..';
import { authorizedUserPreRouting } from '../../common';
import { ScheduleRequestHandler } from '../../common/request_handler';

const { SCHEDULE_PREFIX } = INTERNAL_ROUTES;

export function registerScheduleRoutesInternal(reporting: ReportingCore, logger: Logger) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  const kibanaAccessControlTags = ['generateReport'];

  const registerInternalPostScheduleEndpoint = () => {
    const path = `${SCHEDULE_PREFIX}/{exportType}`;
    router.post(
      {
        path,
        security: {
          authz: {
            requiredPrivileges: kibanaAccessControlTags,
          },
        },
        validate: ScheduleRequestHandler.getValidation(),
        options: {
          tags: kibanaAccessControlTags.map((accessControlTag) => `access:${accessControlTag}`),
          access: 'internal',
        },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        try {
          const requestHandler = new ScheduleRequestHandler({
            reporting,
            user,
            context,
            path,
            req,
            res,
            logger,
          });
          const jobParams = requestHandler.getJobParams();
          const schedule = requestHandler.getSchedule();
          const notification = requestHandler.getNotification();

          return await requestHandler.handleRequest({
            exportTypeId: req.params.exportType,
            jobParams,
            schedule,
            notification,
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

  registerInternalPostScheduleEndpoint();
}
