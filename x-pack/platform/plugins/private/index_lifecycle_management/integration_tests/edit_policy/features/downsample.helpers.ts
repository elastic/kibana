/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import {
  createDownsampleActions,
  createReadonlyActions,
  createRolloverActions,
  createSavePolicyAction,
  createTogglePhaseAction,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';
import { AppServicesContext } from '../../../public/types';

type SetupReturn = ReturnType<typeof setupDownsampleTestBed>;

export type DownsampleTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setupDownsampleTestBed = async (
  httpSetup: HttpSetup,
  args?: {
    appServicesContext?: Partial<AppServicesContext>;
  }
) => {
  const testBed = await initTestBed(httpSetup, args);

  return {
    ...testBed,
    actions: {
      togglePhase: createTogglePhaseAction(testBed),
      savePolicy: createSavePolicyAction(testBed),
      ...createRolloverActions(testBed),
      hot: {
        ...createReadonlyActions(testBed, 'hot'),
        ...createDownsampleActions(testBed, 'hot'),
      },
      warm: {
        ...createReadonlyActions(testBed, 'warm'),
        ...createDownsampleActions(testBed, 'warm'),
      },
      cold: {
        ...createReadonlyActions(testBed, 'cold'),
        ...createDownsampleActions(testBed, 'cold'),
      },
      frozen: {},
    },
  };
};
