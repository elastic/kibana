/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import {
  createColdPhaseActions,
  createDeletePhaseActions,
  createErrorsActions,
  createFormSetValueAction,
  createFormToggleAction,
  createFrozenPhaseActions,
  createHotPhaseActions,
  createRolloverActions,
  createSavePolicyAction,
  createTogglePhaseAction,
  createWarmPhaseActions,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';
import type { InitTestBed } from '../init_test_bed';

export interface ValidationTestBed extends InitTestBed {
  actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    setPolicyName: ReturnType<typeof createFormSetValueAction>;
    savePolicy: ReturnType<typeof createSavePolicyAction>;
    toggleSaveAsNewPolicy: ReturnType<typeof createFormToggleAction>;
  } & ReturnType<typeof createRolloverActions> &
    ReturnType<typeof createErrorsActions> &
    ReturnType<typeof createHotPhaseActions> &
    ReturnType<typeof createWarmPhaseActions> &
    ReturnType<typeof createColdPhaseActions> &
    ReturnType<typeof createFrozenPhaseActions> &
    ReturnType<typeof createDeletePhaseActions>;
}

export const setupValidationTestBed = (httpSetup: HttpSetup): ValidationTestBed => {
  // Render as new policy to show policy name field for validation tests
  const renderResult = initTestBed(httpSetup, {
    initialEntries: ['/policies/edit'],
  });

  return {
    ...renderResult,
    actions: {
      togglePhase: createTogglePhaseAction(),
      setPolicyName: createFormSetValueAction('policyNameField'),
      savePolicy: createSavePolicyAction(httpSetup),
      toggleSaveAsNewPolicy: createFormToggleAction('saveAsNewSwitch'),
      ...createRolloverActions(),
      ...createErrorsActions(),
      ...createHotPhaseActions(),
      ...createWarmPhaseActions(),
      ...createColdPhaseActions(),
      ...createFrozenPhaseActions(),
      ...createDeletePhaseActions(),
    },
  };
};
