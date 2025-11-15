/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import {
  createForceMergeActions,
  createMinAgeActions,
  createReadonlyActions,
  createRolloverActions,
  createSearchableSnapshotActions,
  createShrinkActions,
  createTogglePhaseAction,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';
import type { InitTestBed } from '../init_test_bed';

export interface RolloverTestBed extends InitTestBed {
  actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    hot: ReturnType<typeof createForceMergeActions> &
      ReturnType<typeof createShrinkActions> &
      ReturnType<typeof createReadonlyActions> &
      ReturnType<typeof createSearchableSnapshotActions>;
    warm: ReturnType<typeof createMinAgeActions>;
    cold: ReturnType<typeof createMinAgeActions>;
    frozen: ReturnType<typeof createMinAgeActions>;
    delete: ReturnType<typeof createMinAgeActions>;
  } & ReturnType<typeof createRolloverActions>;
}

export const setup = (httpSetup: HttpSetup): RolloverTestBed => {
  const result = initTestBed(httpSetup);

  return {
    ...result,
    actions: {
      togglePhase: createTogglePhaseAction(),
      ...createRolloverActions(),
      hot: {
        ...createForceMergeActions('hot'),
        ...createShrinkActions('hot'),
        ...createReadonlyActions('hot'),
        ...createSearchableSnapshotActions('hot'),
      },
      warm: {
        ...createMinAgeActions('warm'),
      },
      cold: {
        ...createMinAgeActions('cold'),
      },
      frozen: {
        ...createMinAgeActions('frozen'),
      },
      delete: {
        ...createMinAgeActions('delete'),
      },
    },
  };
};
