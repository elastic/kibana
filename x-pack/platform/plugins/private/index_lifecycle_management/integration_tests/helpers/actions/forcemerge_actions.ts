/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import type { Phase } from '../../../common/types';
import { createFormSetValueAction } from './form_set_value_action';

const createFormCheckboxAction = (dataTestSubject: string) => (checked: boolean) => {
  const checkbox = screen.getByTestId<HTMLInputElement>(dataTestSubject);
  if (checkbox.checked !== checked) {
    fireEvent.click(checkbox);
  }
};

export const createForceMergeActions = (phase: Phase) => {
  const toggleSelector = `${phase}-forceMergeSwitch`;
  return {
    forceMergeExists: () => Boolean(screen.queryByTestId(toggleSelector)),
    toggleForceMerge: () => fireEvent.click(screen.getByTestId(toggleSelector)),
    setForcemergeSegmentsCount: createFormSetValueAction(`${phase}-selectedForceMergeSegments`),
    setBestCompression: createFormCheckboxAction(`${phase}-bestCompression`),
  };
};
