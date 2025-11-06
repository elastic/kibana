/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createForceMergeActions,
  createShrinkActions,
  createReadonlyActions,
  createIndexPriorityActions,
  createSearchableSnapshotActions,
  createMinAgeActions,
  createNodeAllocationActions,
  createReplicasAction,
  createSnapshotPolicyActions,
  createDownsampleActions,
} from '.';

export const createHotPhaseActions = () => {
  return {
    hot: {
      ...createForceMergeActions('hot'),
      ...createShrinkActions('hot'),
      ...createReadonlyActions('hot'),
      ...createIndexPriorityActions('hot'),
      ...createSearchableSnapshotActions('hot'),
      ...createDownsampleActions('hot'),
    },
  };
};
export const createWarmPhaseActions = () => {
  return {
    warm: {
      ...createMinAgeActions('warm'),
      ...createForceMergeActions('warm'),
      ...createShrinkActions('warm'),
      ...createReadonlyActions('warm'),
      ...createIndexPriorityActions('warm'),
      ...createNodeAllocationActions('warm'),
      ...createReplicasAction('warm'),
      ...createDownsampleActions('warm'),
    },
  };
};
export const createColdPhaseActions = () => {
  return {
    cold: {
      ...createMinAgeActions('cold'),
      ...createReplicasAction('cold'),
      ...createReadonlyActions('cold'),
      ...createIndexPriorityActions('cold'),
      ...createNodeAllocationActions('cold'),
      ...createSearchableSnapshotActions('cold'),
      ...createDownsampleActions('cold'),
    },
  };
};

export const createFrozenPhaseActions = () => {
  return {
    frozen: {
      ...createMinAgeActions('frozen'),
      ...createSearchableSnapshotActions('frozen'),
    },
  };
};

export const createDeletePhaseActions = () => {
  return {
    delete: {
      ...createMinAgeActions('delete'),
      ...createSnapshotPolicyActions(),
    },
  };
};
