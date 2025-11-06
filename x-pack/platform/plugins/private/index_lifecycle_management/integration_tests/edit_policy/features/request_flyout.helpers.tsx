/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import {
  createFormSetValueAction,
  createMinAgeActions,
  createTogglePhaseAction,
  createRequestFlyoutActions,
  createFormToggleAction,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';
import type { InitTestBed } from '../init_test_bed';

export interface RequestFlyoutTestBed extends InitTestBed {
  actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    setPolicyName: ReturnType<typeof createFormSetValueAction>;
    toggleSaveAsNewPolicy: ReturnType<typeof createFormToggleAction>;
    warm: ReturnType<typeof createMinAgeActions>;
  } & ReturnType<typeof createRequestFlyoutActions>;
}

export const setupRequestFlyoutTestBed = (
  httpSetup: HttpSetup,
  isNewPolicy?: boolean
): RequestFlyoutTestBed => {
  const renderResult = isNewPolicy
    ? initTestBed(httpSetup, {
        initialEntries: ['/policies/edit'],
      })
    : initTestBed(httpSetup);

  return {
    ...renderResult,
    actions: {
      togglePhase: createTogglePhaseAction(),
      setPolicyName: createFormSetValueAction('policyNameField'),
      toggleSaveAsNewPolicy: createFormToggleAction('saveAsNewSwitch'),
      warm: {
        ...createMinAgeActions('warm'),
      },
      ...createRequestFlyoutActions(),
    },
  };
};
