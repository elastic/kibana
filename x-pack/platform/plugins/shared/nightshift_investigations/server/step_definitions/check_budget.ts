/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CoreStart } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
} from '../saved_objects/automation_budget_saved_object';
import type { NightshiftAutomationBudgetAttributes } from '../lib/automations/types';

const inputSchema = z.object({
  automation_id: z.string().min(1).describe('ID of the nightshift-automation saved object'),
  daily_limit: z
    .number()
    .int()
    .min(0)
    .describe('Maximum dispatches per day. 0 = unlimited.'),
});

const outputSchema = z.object({
  allowed: z.boolean(),
  used: z.number().int(),
  limit: z.number().int(),
});

export const checkBudgetStepDefinition = (getCoreStart: () => CoreStart | undefined) =>
  createServerStepDefinition({
    id: 'nightshift.checkBudget',
    label: 'Check Nightshift Automation Budget',
    category: StepCategory.Data,
    description:
      'Checks and increments the daily dispatch counter for an automation. Returns whether the current dispatch is allowed.',
    inputSchema,
    outputSchema,
    handler: async (context) => {
      const input = inputSchema.parse(context.input);

      if (input.daily_limit === 0) {
        return { output: { allowed: true, used: 0, limit: 0 } };
      }

      const coreStart = getCoreStart();
      if (!coreStart) {
        context.logger.warn(
          'nightshift.checkBudget: CoreStart not available, failing open to allow dispatch'
        );
        return { output: { allowed: true, used: 0, limit: input.daily_limit } };
      }

      // getFakeRequest() does not carry space info — read it from workflow context explicitly.
      // See https://github.com/elastic/kibana/issues/284786.
      const request = context.contextManager.getFakeRequest();
      const spaceId = context.contextManager.getContext().workflow.spaceId;

      const savedObjectsClient = coreStart.savedObjects
        .getScopedClient(request, {
          excludedExtensions: [SECURITY_EXTENSION_ID],
          includedHiddenTypes: [],
        })
        .asScopedToNamespace(spaceId);

      const today = new Date().toISOString().slice(0, 10);

      const findResult = await savedObjectsClient.find<NightshiftAutomationBudgetAttributes>({
        type: NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
        filter: `${NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE}.attributes.automationId: "${input.automation_id}" AND ${NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE}.attributes.date: "${today}"`,
        perPage: 1,
      });

      const existing = findResult.saved_objects[0];
      const used = existing ? existing.attributes.used : 0;

      if (used >= input.daily_limit) {
        return { output: { allowed: false, used, limit: input.daily_limit } };
      }

      if (existing) {
        await savedObjectsClient.update<NightshiftAutomationBudgetAttributes>(
          NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
          existing.id,
          { used: used + 1 }
        );
      } else {
        await savedObjectsClient.create<NightshiftAutomationBudgetAttributes>(
          NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
          { automationId: input.automation_id, date: today, used: 1 }
        );
      }

      return { output: { allowed: true, used: used + 1, limit: input.daily_limit } };
    },
  });
