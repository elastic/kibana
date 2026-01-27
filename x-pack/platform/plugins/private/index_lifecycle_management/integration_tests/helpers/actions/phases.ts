/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import { createForceMergeActions } from './forcemerge_actions';
import { createShrinkActions } from './shrink_actions';
import { createReadonlyActions } from './readonly_actions';
import { createSearchableSnapshotActions } from './searchable_snapshot_actions';
import { createMinAgeActions } from './min_age_actions';
import { createNodeAllocationActions } from './node_allocation_actions';
import { createDownsampleActions } from './downsample_actions';
import { createFormToggleAndSetValueAction } from './form_toggle_and_set_value_action';
import type { Phase } from '../../../common/types';

const setSnapshotPolicy = (snapshotPolicyName: string) => {
  const input = screen.getByTestId('snapshotPolicyCombobox') as HTMLInputElement;
  fireEvent.change(input, { target: { value: snapshotPolicyName } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });
};

export const createHotPhaseActions = () => {
  const phase: Phase = 'hot';
  const toggleSelector = `${phase}-indexPrioritySwitch`;
  return {
    hot: {
      ...createForceMergeActions('hot'),
      ...createShrinkActions('hot'),
      ...createReadonlyActions('hot'),
      indexPriorityExists: () => Boolean(screen.queryByTestId(toggleSelector)),
      toggleIndexPriority: () => fireEvent.click(screen.getByTestId(toggleSelector)),
      setIndexPriority: createFormToggleAndSetValueAction(toggleSelector, `${phase}-indexPriority`),
      ...createSearchableSnapshotActions('hot'),
      ...createDownsampleActions('hot'),
    },
  };
};
export const createWarmPhaseActions = () => {
  const phase: Phase = 'warm';
  const toggleSelector = `${phase}-indexPrioritySwitch`;
  return {
    warm: {
      ...createMinAgeActions('warm'),
      ...createForceMergeActions('warm'),
      ...createShrinkActions('warm'),
      ...createReadonlyActions('warm'),
      indexPriorityExists: () => Boolean(screen.queryByTestId(toggleSelector)),
      toggleIndexPriority: () => fireEvent.click(screen.getByTestId(toggleSelector)),
      setIndexPriority: createFormToggleAndSetValueAction(toggleSelector, `${phase}-indexPriority`),
      ...createNodeAllocationActions('warm'),
      setReplicas: createFormToggleAndSetValueAction(
        `${phase}-setReplicasSwitch`,
        `${phase}-selectedReplicaCount`
      ),
      ...createDownsampleActions('warm'),
    },
  };
};
export const createColdPhaseActions = () => {
  const phase: Phase = 'cold';
  const toggleSelector = `${phase}-indexPrioritySwitch`;
  return {
    cold: {
      ...createMinAgeActions('cold'),
      setReplicas: createFormToggleAndSetValueAction(
        `${phase}-setReplicasSwitch`,
        `${phase}-selectedReplicaCount`
      ),
      ...createReadonlyActions('cold'),
      indexPriorityExists: () => Boolean(screen.queryByTestId(toggleSelector)),
      toggleIndexPriority: () => fireEvent.click(screen.getByTestId(toggleSelector)),
      setIndexPriority: createFormToggleAndSetValueAction(toggleSelector, `${phase}-indexPriority`),
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
      setSnapshotPolicy,
      hasCustomPolicyCallout: () => Boolean(screen.queryByTestId('customPolicyCallout')),
      hasPolicyErrorCallout: () => Boolean(screen.queryByTestId('policiesErrorCallout')),
      hasNoPoliciesCallout: () => Boolean(screen.queryByTestId('noPoliciesCallout')),
    },
  };
};
