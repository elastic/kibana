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
  // name: schema.string(),
  // enabled: schema.boolean({ defaultValue: true }),
  // schedule: schema.object({
  //   interval: schema.string(),
  // }),
  // ruleFilters: schema.maybe(
  //   schema.object({
  //     ruleTypeIds: schema.maybe(schema.arrayOf(schema.string())),
  //     consumers: schema.maybe(schema.arrayOf(schema.string())),
  //     tags: schema.maybe(schema.arrayOf(schema.string())),
  //     names: schema.maybe(schema.arrayOf(schema.string())),
  //   })
  // ),
  // gapFilters: schema.maybe(
  //   schema.object({
  //     statuses: schema.maybe(schema.arrayOf(schema.string())),
  //     minGapDuration: schema.maybe(schema.string()),
  //   })
  // ),
  // processingConfig: schema.maybe(
  //   schema.object({
  //     maxConcurrentRules: schema.maybe(schema.number()),
  //     maxGapsPerRule: schema.maybe(schema.number()),
  //   })
  // ),
});

export type AutoFillPayload = TypeOf<typeof autoFillSchema>;

export const createAutoFillRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: '/api/alerting/gaps/auto_fill',
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
        const autoFill = {
          schedule: {
            interval: '1m',
          },
          name: 'gap-fill-auto-fill-name',
        };
        // Generate a unique auto fill/task ID (could use uuid or a simple timestamp-based id)
        const autoFillId = `gap-fill-auto-fill-${Date.now()}`;
        // Schedule the task in Task Manager with user context
        try {
          await taskManager.schedule(
            {
              id: 'default',
              taskType: 'gap-fill-processor', // This task type must be registered elsewhere
              schedule: autoFill.schedule,
              scope: ['securitySolution'],
              params: {},
              state: {
                config: {
                  name: 'gap-fill-auto-fill-name',
                  amountOfGapsToProcessPerRun: 100,
                  amountOfRetries: 3,
                  excludeRuleIds: [],
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