/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { TestBedConfig } from '@kbn/test-jest-helpers';

import type { AppServicesContext } from '../../../../public/types';
import { createTogglePhaseAction, createNodeAllocationActions } from '../../../helpers';
import { initTestBed } from '../../init_test_bed';
import type { InitTestBed } from '../../init_test_bed';

export interface CloudNodeAllocationTestBed extends InitTestBed {
  actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    warm: ReturnType<typeof createNodeAllocationActions>;
    cold: ReturnType<typeof createNodeAllocationActions>;
  };
}

export const setupCloudNodeAllocation = (
  httpSetup: HttpSetup,
  arg?: {
    appServicesContext?: Partial<AppServicesContext>;
    testBedConfig?: Partial<TestBedConfig>;
  }
): CloudNodeAllocationTestBed => {
  const renderResult = initTestBed(httpSetup, arg);

  return {
    ...renderResult,
    actions: {
      togglePhase: createTogglePhaseAction(),
      warm: {
        ...createNodeAllocationActions('warm'),
      },
      cold: {
        ...createNodeAllocationActions('cold'),
      },
    },
  };
};
