/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';

const createSetWaitForSnapshotAction = (testBed: TestBed) => async (snapshotPolicyName: string) => {
  const { find, component } = testBed;
  act(() => {
    find('snapshotPolicyCombobox').simulate('change', [{ label: snapshotPolicyName }]);
  });
  component.update();
};

export const createSnapshotPolicyActions = (testBed: TestBed) => {
  const { exists } = testBed;
  return {
    setSnapshotPolicy: createSetWaitForSnapshotAction(testBed),
    hasCustomPolicyCallout: () => exists('customPolicyCallout'),
    hasPolicyErrorCallout: () => exists('policiesErrorCallout'),
    hasNoPoliciesCallout: () => exists('noPoliciesCallout'),
  };
};
