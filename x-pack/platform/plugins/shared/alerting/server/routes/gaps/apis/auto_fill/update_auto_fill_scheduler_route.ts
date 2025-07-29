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

// Define the schema for the auto fill update payload
export const updateAutoFillSchema = schema.object({
  schedule: schema.maybe(
    schema.object({
      interval: schema.string(),
    })
  ),
  name: schema.maybe(schema.string()),
  amountOfGapsToProcessPerRun: schema.maybe(schema.number()),
  amountOfRetries: schema.maybe(schema.number()),
  excludeRuleIds: schema.maybe(schema.arrayOf(schema.string())),
  gapFillRange: schema.maybe(schema.string()),
  enabled: schema.maybe(schema.boolean()), // <-- Added enabled field
});

export type UpdateAutoFillPayload = schema.TypeOf<typeof updateAutoFillSchema>;

export const updateAutoFillSchedulerRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.put(
    {
      path: '/internal/alerting/rules/gaps/auto_fill_scheduler/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: updateAutoFillSchema,
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
        const {
          schedule,
          name,
          amountOfGapsToProcessPerRun,
          amountOfRetries,
          excludeRuleIds,
          gapFillRange,
          enabled,
        } = req.body;

        const alertingContext = await context.alerting;
        const taskManager = (await alertingContext.getRulesClient()).getTaskManager();

        try {
          // Get the current task to verify it exists and is the right type
          const task = await taskManager.get(id);

          if (task.taskType !== 'gap-fill-auto-scheduler') {
            return res.badRequest({
              body: { message: `Task with id ${id} is not a gap-fill-auto-scheduler task` },
            });
          }

          // Enable/disable if requested
          if (enabled !== undefined) {
            if (enabled) {
              await taskManager.bulkEnable([id]);
            } else {
              await taskManager.bulkDisable([id]);
            }
          }

          // Update schedule if provided
          if (schedule) {
            await taskManager.bulkUpdateSchedules([id], schedule);
          }

          // Update config fields if provided
          if (
            name !== undefined ||
            amountOfGapsToProcessPerRun !== undefined ||
            amountOfRetries !== undefined ||
            excludeRuleIds !== undefined ||
            gapFillRange !== undefined ||
            schedule !== undefined
          ) {
            await taskManager.bulkUpdateState(
              [id],
              (currentState) => ({
                ...currentState, // Preserve existing state fields
                config: {
                  ...currentState.config, // Preserve existing config
                  ...(name !== undefined && { name }),
                  ...(amountOfGapsToProcessPerRun !== undefined && { amountOfGapsToProcessPerRun }),
                  ...(amountOfRetries !== undefined && { amountOfRetries }),
                  ...(excludeRuleIds !== undefined && { excludeRuleIds }),
                  ...(gapFillRange !== undefined && { gapFillRange }),
                  ...(schedule !== undefined && { schedule }),
                },
              }),
              (currentParams) => ({
                ...currentParams,
                name: 'YOYOYO',
              })
            );
          }

          // Get the updated task to return
          const updatedTask = await taskManager.get(id);

          return res.ok({
            body: {
              id: updatedTask.id,
              taskType: updatedTask.taskType,
              status: updatedTask.status,
              enabled: updatedTask.enabled,
              runAt: updatedTask.runAt,
              scheduledAt: updatedTask.scheduledAt,
              attempts: updatedTask.attempts,
              params: updatedTask.params,
              state: updatedTask.state,
              schedule: updatedTask.schedule,
              message: 'Gap fill auto fill updated successfully',
            },
          });
        } catch (error) {
          if (error?.output?.statusCode === 404) {
            return res.notFound({ body: { message: `Task with id ${id} not found` } });
          }
          return res.customError({
            statusCode: 500,
            body: { message: error.message || 'Error updating task' },
          });
        }
      })
    )
  );
};
