/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import {
  createDownsampleActions,
  createForceMergeActions,
  createMinAgeActions,
  createReadonlyActions,
  createRolloverActions,
  createSavePolicyAction,
  createSearchableSnapshotActions,
  createShrinkActions,
  createTogglePhaseAction,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';
import type { InitTestBed } from '../init_test_bed';
import type { AppServicesContext } from '../../../public/types';

export interface SearchableSnapshotsTestBed extends InitTestBed {
  actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    savePolicy: ReturnType<typeof createSavePolicyAction>;
    hot: ReturnType<typeof createSearchableSnapshotActions> &
      ReturnType<typeof createForceMergeActions> &
      ReturnType<typeof createShrinkActions> &
      ReturnType<typeof createDownsampleActions>;
    warm: ReturnType<typeof createForceMergeActions> &
      ReturnType<typeof createShrinkActions> &
      ReturnType<typeof createReadonlyActions> &
      ReturnType<typeof createDownsampleActions>;
    cold: ReturnType<typeof createMinAgeActions> &
      ReturnType<typeof createSearchableSnapshotActions> &
      ReturnType<typeof createReadonlyActions> &
      ReturnType<typeof createDownsampleActions>;
    frozen: ReturnType<typeof createMinAgeActions> &
      ReturnType<typeof createSearchableSnapshotActions>;
  } & ReturnType<typeof createRolloverActions>;
}

export const setupSearchableSnapshotsTestBed = (
  httpSetup: HttpSetup,
  args?: {
    appServicesContext?: Partial<AppServicesContext>;
  }
): SearchableSnapshotsTestBed => {
  const renderResult = initTestBed(httpSetup, args);

  return {
    ...renderResult,
    actions: {
      togglePhase: createTogglePhaseAction(),
      savePolicy: createSavePolicyAction(httpSetup),
      ...createRolloverActions(),
      hot: {
        ...createSearchableSnapshotActions('hot'),
        ...createForceMergeActions('hot'),
        ...createShrinkActions('hot'),
        ...createDownsampleActions('hot'),
      },
      warm: {
        ...createForceMergeActions('warm'),
        ...createShrinkActions('warm'),
        ...createReadonlyActions('warm'),
        ...createDownsampleActions('warm'),
      },
      cold: {
        ...createMinAgeActions('cold'),
        ...createSearchableSnapshotActions('cold'),
        ...createReadonlyActions('cold'),
        ...createDownsampleActions('cold'),
      },
      frozen: {
        ...createMinAgeActions('frozen'),
        ...createSearchableSnapshotActions('frozen'),
      },
    },
  };
};
