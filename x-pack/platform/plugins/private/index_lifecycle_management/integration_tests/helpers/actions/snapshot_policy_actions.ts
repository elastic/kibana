/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';

const createSetWaitForSnapshotAction = () => (snapshotPolicyName: string) => {
  // The data-test-subj is on the input element itself for ComboBoxField
  const input = screen.getByTestId('snapshotPolicyCombobox') as HTMLInputElement;

  // Type the value
  fireEvent.change(input, { target: { value: snapshotPolicyName } });

  // Simulate creating a custom option by pressing Enter
  // This triggers onCreateOption in the EUI ComboBox
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });
};

export const createSnapshotPolicyActions = () => {
  return {
    setSnapshotPolicy: createSetWaitForSnapshotAction(),
    hasCustomPolicyCallout: () => Boolean(screen.queryByTestId('customPolicyCallout')),
    hasPolicyErrorCallout: () => Boolean(screen.queryByTestId('policiesErrorCallout')),
    hasNoPoliciesCallout: () => Boolean(screen.queryByTestId('noPoliciesCallout')),
  };
};
