/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import {
  createDeleteSearchableSnapshotActions,
  createMinAgeActions,
  createSavePolicyAction,
  createSnapshotPolicyActions,
  createTogglePhaseAction,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';
import type { InitTestBed } from '../init_test_bed';

export interface DeleteTestBed extends InitTestBed {
  actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    savePolicy: ReturnType<typeof createSavePolicyAction>;
    delete: {
      isShown: () => boolean;
    } & ReturnType<typeof createMinAgeActions> &
      ReturnType<typeof createSnapshotPolicyActions> &
      ReturnType<typeof createDeleteSearchableSnapshotActions>;
  };
}

export const setupDeleteTestBed = (httpSetup: HttpSetup): DeleteTestBed => {
  const renderResult = initTestBed(httpSetup);

  return {
    ...renderResult,
    actions: {
      togglePhase: createTogglePhaseAction(),
      savePolicy: createSavePolicyAction(httpSetup),
      delete: {
        isShown: () => Boolean(screen.queryByTestId('delete-phase')),
        ...createMinAgeActions('delete'),
        ...createSnapshotPolicyActions(),
        ...createDeleteSearchableSnapshotActions(),
      },
    },
  };
};
