/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';

import { createAddToExistingCaseLensAction } from './add_to_existing_case';
import type { CasesActionContextProps, Services } from './types';

export const registerUIActions = (
  casesActionContextProps: CasesActionContextProps,
  services: Services
) => {
  const addToExistingCaseAction = createAddToExistingCaseLensAction(
    casesActionContextProps,
    services
  );
  services.plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, addToExistingCaseAction);
};
