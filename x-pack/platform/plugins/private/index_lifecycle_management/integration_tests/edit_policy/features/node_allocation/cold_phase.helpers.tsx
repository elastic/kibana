/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { createNodeAllocationActions, createTogglePhaseAction } from '../../../helpers';
import { initTestBed } from '../../init_test_bed';
import type { InitTestBed } from '../../init_test_bed';

export interface NodeAllocationTestBed extends InitTestBed {
  actions: {
    toggleColdPhase: () => Promise<void>;
  } & ReturnType<typeof createNodeAllocationActions>;
}

export const setupColdPhaseNodeAllocation = (httpSetup: HttpSetup): NodeAllocationTestBed => {
  const renderResult = initTestBed(httpSetup);

  return {
    ...renderResult,
    actions: {
      toggleColdPhase: async () => await createTogglePhaseAction()('cold'),
      ...createNodeAllocationActions('cold'),
    },
  };
};
