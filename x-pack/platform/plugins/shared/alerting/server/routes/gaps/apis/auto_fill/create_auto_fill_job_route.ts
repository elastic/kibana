/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';

// Define the schema for the job creation payload
export const autoFillJobSchema = schema.object({
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

export type AutoFillJobPayload = TypeOf<typeof autoFillJobSchema>;

export const createAutoFillJobRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: '/api/alerting/gaps/auto_fill/jobs',
      validate: { body: autoFillJobSchema },
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
        console.log('createAutoFillJobRoute');
        const alertingContext = await context.alerting;
        const taskManager = (await alertingContext.getRulesClient()).getTaskManager();
        console.log('taskManager', JSON.stringify(taskManager, null, 2));
        const job = {
          schedule: {
            interval: '1m',
          },
          name: 'gap-fill-job-name',
        };
        console.log('TaskManagerStartContract', JSON.stringify(taskManager));
        // Generate a unique job/task ID (could use uuid or a simple timestamp-based id)
        const jobId = `gap-fill-job-${Date.now()}`;
        // Schedule the task in Task Manager
        try {
          await taskManager.schedule({
            id: 'default',
            taskType: 'gap-fill-processor', // This task type must be registered elsewhere
            schedule: job.schedule,
            scope: ['securitySolution'],
            params: {},
            state: {
              name: 'gap-fill-job-name',
              amountOfGapsToProcessPerRun: 100,
              amountOfRetries: 3,
              lastRun: null,
              processedRules: 0,
            },
          });
        } catch (error) {
          console.error('Error scheduling task:', JSON.stringify(error, null, 2), error);
        }
        return res.ok({
          body: {
            id: jobId,
            message: 'Gap fill job created and scheduled',
          },
        });
      })
    )
  );
};
