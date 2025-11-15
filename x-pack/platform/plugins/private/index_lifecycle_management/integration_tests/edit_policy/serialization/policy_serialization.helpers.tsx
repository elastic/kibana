/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AppServicesContext } from '../../../public/types';
import {
  createColdPhaseActions,
  createDeletePhaseActions,
  createFormSetValueAction,
  createFrozenPhaseActions,
  createHotPhaseActions,
  createRolloverActions,
  createSavePolicyAction,
  createTogglePhaseAction,
  createWarmPhaseActions,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';
import type { InitTestBed } from '../init_test_bed';

export interface SerializationTestBed extends InitTestBed {
  actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    savePolicy: ReturnType<typeof createSavePolicyAction>;
    setPolicyName: ReturnType<typeof createFormSetValueAction>;
  } & ReturnType<typeof createRolloverActions> &
    ReturnType<typeof createHotPhaseActions> &
    ReturnType<typeof createWarmPhaseActions> &
    ReturnType<typeof createColdPhaseActions> &
    ReturnType<typeof createFrozenPhaseActions> &
    ReturnType<typeof createDeletePhaseActions>;
}

export const setupSerializationTestBed = (
  httpSetup: HttpSetup,
  arg?: {
    appServicesContext?: Partial<AppServicesContext>;
    isNewPolicy?: boolean;
  }
): SerializationTestBed => {
  const { isNewPolicy, ...restArg } = arg || {};
  const renderResult = initTestBed(httpSetup, {
    ...restArg,
    initialEntries: isNewPolicy ? ['/policies/edit'] : undefined,
  });

  return {
    ...renderResult,
    actions: {
      togglePhase: createTogglePhaseAction(),
      savePolicy: createSavePolicyAction(httpSetup),
      setPolicyName: createFormSetValueAction('policyNameField'),
      ...createRolloverActions(),
      ...createHotPhaseActions(),
      ...createWarmPhaseActions(),
      ...createColdPhaseActions(),
      ...createFrozenPhaseActions(),
      ...createDeletePhaseActions(),
    },
  };
};
