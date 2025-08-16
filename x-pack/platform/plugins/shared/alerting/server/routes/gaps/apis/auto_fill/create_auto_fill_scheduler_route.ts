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
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

// Define the schema for the auto fill creation payload
export const autoFillSchema = schema.object({
  name: schema.maybe(schema.string()),
  maxAmountOfGapsToProcessPerRun: schema.maybe(schema.number()),
  maxAmountOfRulesToProcessPerRun: schema.maybe(schema.number()),
  amountOfRetries: schema.maybe(schema.number()),
  rulesFilter: schema.maybe(schema.string()),
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
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const taskManager = (await alertingContext.getRulesClient()).getTaskManager();
        const {
          name,
          maxAmountOfGapsToProcessPerRun,
          maxAmountOfRulesToProcessPerRun,
          amountOfRetries,
          rulesFilter,
          gapFillRange,
          schedule,
        } = req.body;
        const autoFill = {
          schedule: schedule || {
            interval: '1h',
          },
          name: name || 'gap-fill-auto-fill-name',
        };
        try {
          await taskManager.schedule(
            {
              id: 'default', // a id for the task just for POC
              taskType: 'gap-fill-auto-scheduler', // This task type must be registered elsewhere
              schedule: autoFill.schedule,
              scope: ['securitySolution'],
              params: {},
              state: {
                config: {
                  name: name || 'gap-fill-auto-fill-name',
                  maxAmountOfGapsToProcessPerRun: maxAmountOfGapsToProcessPerRun || 10000,
                  maxAmountOfRulesToProcessPerRun: maxAmountOfRulesToProcessPerRun || 100,
                  amountOfRetries: amountOfRetries || 3,
                  rulesFilter: rulesFilter || '',
                  gapFillRange: gapFillRange || 'now-7d',
                },
                lastRun: null,
              },
            },
            {
              request: req,
            }
          );
        } catch (error) {
          throw error;
        }
        return res.ok({
          body: {
            message: 'Gap fill auto fill created and scheduled',
          },
        });
      })
    )
  );
};
