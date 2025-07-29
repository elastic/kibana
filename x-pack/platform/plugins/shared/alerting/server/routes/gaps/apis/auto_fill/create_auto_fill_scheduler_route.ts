/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';

// Define the schema for the auto fill creation payload
export const autoFillSchema = schema.object({
  name: schema.maybe(schema.string()),
  amountOfGapsToProcessPerRun: schema.maybe(schema.number()),
  amountOfRetries: schema.maybe(schema.number()),
  excludeRuleIds: schema.maybe(schema.arrayOf(schema.string())),
  gapFillRange: schema.maybe(schema.string()),
  schedule: schema.maybe(
    schema.object({
      interval: schema.string(),
    })
  ),
});

export type AutoFillPayload = TypeOf<typeof autoFillSchema>;

export const createAutoFillSchedulerRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: '/internal/alerting/rules/gaps/auto_fill_scheduler',
      validate: { body: autoFillSchema },
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
        const alertingContext = await context.alerting;
        const taskManager = (await alertingContext.getRulesClient()).getTaskManager();
        const {
          name,
          amountOfGapsToProcessPerRun,
          amountOfRetries,
          excludeRuleIds,
          gapFillRange,
          schedule,
        } = req.body;
        const autoFill = {
          schedule: schedule || {
            interval: '1h',
          },
          name: name || 'gap-fill-auto-fill-name',
        };
        // Generate a unique auto fill/task ID (could use uuid or a simple timestamp-based id)
        const autoFillId = `gap-fill-auto-fill-${Date.now()}`;
        // Schedule the task in Task Manager with user context
        try {
          await taskManager.schedule(
            {
              id: 'default',
              taskType: 'gap-fill-auto-scheduler', // This task type must be registered elsewhere
              schedule: autoFill.schedule,
              scope: ['securitySolution'],
              params: {},
              state: {
                config: {
                  name: name || 'gap-fill-auto-fill-name',
                  amountOfGapsToProcessPerRun: amountOfGapsToProcessPerRun || 100,
                  amountOfRetries: amountOfRetries || 3,
                  excludeRuleIds: excludeRuleIds || [],
                  gapFillRange: gapFillRange || 'now-7d',
                },
                lastRun: null,
              },
            },
            {
              request: req, // This is the key! Pass the request to get user context
            }
          );
        } catch (error) {
          throw error;
        }
        return res.ok({
          body: {
            id: autoFillId,
            message: 'Gap fill auto fill created and scheduled',
          },
        });
      })
    )
  );
};
