/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { CasesActionContextProps, Services } from './types';
import { ADD_TO_EXISTING_CASE_ACTION_ID } from './constants';

export const registerUIActions = (
  casesActionContextProps: CasesActionContextProps,
  services: Services
) => {
  services.plugins.uiActions.addTriggerActionAsync(
    CONTEXT_MENU_TRIGGER,
    ADD_TO_EXISTING_CASE_ACTION_ID,
    async () => {
      const { createAddToExistingCaseLensAction } = await import('./add_to_existing_case');
      return createAddToExistingCaseLensAction(casesActionContextProps, services);
    }
  );
};
