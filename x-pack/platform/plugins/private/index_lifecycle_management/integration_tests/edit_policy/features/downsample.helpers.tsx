/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import {
  createDownsampleActions,
  createReadonlyActions,
  createRolloverActions,
  createSavePolicyAction,
  createTogglePhaseAction,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';
import type { InitTestBed } from '../init_test_bed';
import type { AppServicesContext } from '../../../public/types';

export interface DownsampleTestBed extends InitTestBed {
  actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    savePolicy: ReturnType<typeof createSavePolicyAction>;
    hot: ReturnType<typeof createReadonlyActions> & ReturnType<typeof createDownsampleActions>;
    warm: ReturnType<typeof createReadonlyActions> & ReturnType<typeof createDownsampleActions>;
    cold: ReturnType<typeof createReadonlyActions> & ReturnType<typeof createDownsampleActions>;
    frozen: Record<string, never>;
  } & ReturnType<typeof createRolloverActions>;
}

export const setupDownsampleTestBed = (
  httpSetup: HttpSetup,
  args?: {
    appServicesContext?: Partial<AppServicesContext>;
  }
): DownsampleTestBed => {
  const renderResult = initTestBed(httpSetup, args);

  return {
    ...renderResult,
    actions: {
      togglePhase: createTogglePhaseAction(),
      savePolicy: createSavePolicyAction(httpSetup),
      ...createRolloverActions(),
      hot: {
        ...createReadonlyActions('hot'),
        ...createDownsampleActions('hot'),
      },
      warm: {
        ...createReadonlyActions('warm'),
        ...createDownsampleActions('warm'),
      },
      cold: {
        ...createReadonlyActions('cold'),
        ...createDownsampleActions('cold'),
      },
      frozen: {},
    },
  };
};
