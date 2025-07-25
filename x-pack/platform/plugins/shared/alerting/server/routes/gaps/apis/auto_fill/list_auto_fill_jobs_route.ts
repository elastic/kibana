/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';

export const listAutoFillJobsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: '/api/alerting/gaps/auto_fill/jobs',
      validate: {
        query: schema.object({
          scope: schema.maybe(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          const { scope } = req.query;
          const alertingContext = await context.alerting;
          const taskManager = (await alertingContext.getRulesClient()).getTaskManager();
          const must = [{ term: { 'task.taskType': 'gap-fill-processor' } }];
          if (scope) {
            must.push({ term: { 'task.scope': scope } });
          }
          const result = await taskManager.fetch({
            query: must.length > 1 ? { bool: { must } } : must[0],
          });
          return res.ok({ body: result.docs });
        } catch (error) {
          return res.customError({
            statusCode: 500,
            body: { message: error.message || 'Error fetching gap fill jobs' },
          });
        }
      })
    )
  );
}; 