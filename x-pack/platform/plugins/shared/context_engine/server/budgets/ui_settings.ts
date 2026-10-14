/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, SavedObjectsClientContract } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { MAX_MONTHLY_BUDGET_USD } from '../../common/budgets';
import {
  CONTEXT_ENGINE_AUTOMATIONS_BUDGET_SETTING_ID,
  CONTEXT_ENGINE_SUGGESTIONS_BUDGET_SETTING_ID,
} from '../../common/constants';
import type { SpaceBudgetLimits } from './budget_service';

/** Registers the space-scoped monthly limits. `0` disables the limit. */
export const registerBudgetUiSettings = (uiSettings: CoreSetup['uiSettings']): void => {
  uiSettings.register({
    [CONTEXT_ENGINE_SUGGESTIONS_BUDGET_SETTING_ID]: {
      name: i18n.translate('xpack.contextEngine.uiSettings.suggestionsBudget.name', {
        defaultMessage: 'Context Engine automation suggestions budget (USD per month)',
      }),
      description: i18n.translate('xpack.contextEngine.uiSettings.suggestionsBudget.description', {
        defaultMessage:
          'Estimated spend limit for the agent conversations that suggest automations, across all AI indices in this space. New suggestions pause once it is reached and resume when the month resets. Set to 0 for no limit.',
      }),
      schema: schema.number({ min: 0, max: MAX_MONTHLY_BUDGET_USD }),
      value: 0,
      experimental: true,
      requiresPageReload: false,
      readonly: false,
    },
    [CONTEXT_ENGINE_AUTOMATIONS_BUDGET_SETTING_ID]: {
      name: i18n.translate('xpack.contextEngine.uiSettings.automationsBudget.name', {
        defaultMessage: 'Context Engine automation runs budget (USD per month)',
      }),
      description: i18n.translate('xpack.contextEngine.uiSettings.automationsBudget.description', {
        defaultMessage:
          'Estimated spend limit for the automation workflows that generate and maintain Knowledge Indicators, across all AI indices in this space. Automations pause once it is reached and resume when the month resets. Set to 0 for no limit.',
      }),
      schema: schema.number({ min: 0, max: MAX_MONTHLY_BUDGET_USD }),
      value: 0,
      experimental: true,
      requiresPageReload: false,
      readonly: false,
    },
  });
};

/** Reads the limits of one space without a request, so scheduled runs can be checked too. */
export const readSpaceBudgetLimits = async ({
  savedObjects,
  uiSettings,
  spaceId,
}: {
  savedObjects: { getUnsafeInternalClient: () => SavedObjectsClientContract };
  uiSettings: {
    asScopedToClient: (client: SavedObjectsClientContract) => {
      get: <T>(key: string) => Promise<T>;
    };
  };
  spaceId: string;
}): Promise<SpaceBudgetLimits> => {
  const soClient = savedObjects.getUnsafeInternalClient().asScopedToNamespace(spaceId);
  const spaceUiSettings = uiSettings.asScopedToClient(soClient);
  const [suggestions, automations] = await Promise.all([
    spaceUiSettings.get<number>(CONTEXT_ENGINE_SUGGESTIONS_BUDGET_SETTING_ID),
    spaceUiSettings.get<number>(CONTEXT_ENGINE_AUTOMATIONS_BUDGET_SETTING_ID),
  ]);
  return { suggestions, automations };
};
