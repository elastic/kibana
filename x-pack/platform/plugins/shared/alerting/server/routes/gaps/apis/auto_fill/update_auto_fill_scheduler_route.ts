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
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const updateAutoFillSchema = schema.object({
  schedule: schema.maybe(
    schema.object({
      interval: schema.string(),
    })
  ),
  name: schema.maybe(schema.string()),
  maxAmountOfGapsToProcessPerRun: schema.maybe(schema.number()),
  maxAmountOfRulesToProcessPerRun: schema.maybe(schema.number()),
  amountOfRetries: schema.maybe(schema.number()),
  rulesFilter: schema.maybe(schema.string()),
  gapFillRange: schema.maybe(schema.string()),
  enabled: schema.maybe(schema.boolean()),
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
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { id } = req.params;
        const {
          schedule,
          name,
          maxAmountOfGapsToProcessPerRun,
          maxAmountOfRulesToProcessPerRun,
          amountOfRetries,
          rulesFilter,
          gapFillRange,
          enabled,
        } = req.body;

        const alertingContext = await context.alerting;
        const taskManager = (await alertingContext.getRulesClient()).getTaskManager();

        try {
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
            maxAmountOfGapsToProcessPerRun !== undefined ||
            maxAmountOfRulesToProcessPerRun !== undefined ||
            amountOfRetries !== undefined ||
            rulesFilter !== undefined ||
            gapFillRange !== undefined ||
            schedule !== undefined
          ) {
            await taskManager.bulkUpdateState([id], (currentState) => ({
              ...currentState, // Preserve existing state fields
              config: {
                ...currentState.config, // Preserve existing config
                ...(name !== undefined && { name }),
                ...(maxAmountOfGapsToProcessPerRun !== undefined && {
                  maxAmountOfGapsToProcessPerRun,
                }),
                ...(maxAmountOfRulesToProcessPerRun !== undefined && {
                  maxAmountOfRulesToProcessPerRun,
                }),
                ...(amountOfRetries !== undefined && { amountOfRetries }),
                ...(rulesFilter !== undefined && { rulesFilter }),
                ...(gapFillRange !== undefined && { gapFillRange }),
                ...(schedule !== undefined && { schedule }),
              },
            }));
          }

          const updatedTask = await taskManager.get(id);

          return res.ok({
            body: updatedTask,
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
