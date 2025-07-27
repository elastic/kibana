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

export const getAutoFillStatusRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: '/api/alerting/gaps/auto_fill/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
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
        const { id } = req.params;
        try {
          const alertingContext = await context.alerting;
          const taskManager = (await alertingContext.getRulesClient()).getTaskManager();
          const task = await taskManager.get(id);
          if (!task) {
            return res.notFound({ body: { message: `Task with id ${id} not found` } });
          }
          // Return relevant task info
          return res.ok({
            body: {
              ...task,
              lastRun: task.state?.lastRun || task.startedAt,
            },
          });
        } catch (error) {
          if (error?.output?.statusCode === 404) {
            return res.notFound({ body: { message: `Task with id ${id} not found` } });
          }
          return res.customError({
            statusCode: 500,
            body: { message: error.message || 'Error fetching task info' },
          });
        }
      })
    )
  );
}; 