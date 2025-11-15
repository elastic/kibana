/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import {
  createNodeAllocationActions,
  createReplicasAction,
  createSavePolicyAction,
} from '../../../helpers';
import { initTestBed } from '../../init_test_bed';
import type { InitTestBed } from '../../init_test_bed';

export interface GeneralNodeAllocationTestBed extends InitTestBed {
  actions: {
    savePolicy: ReturnType<typeof createSavePolicyAction>;
  } & ReturnType<typeof createNodeAllocationActions> &
    ReturnType<typeof createReplicasAction>;
}

export const setupGeneralNodeAllocation = (httpSetup: HttpSetup): GeneralNodeAllocationTestBed => {
  const renderResult = initTestBed(httpSetup);

  return {
    ...renderResult,
    actions: {
      ...createNodeAllocationActions('warm'),
      savePolicy: createSavePolicyAction(httpSetup),
      ...createReplicasAction('warm'),
    },
  };
};
