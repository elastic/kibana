/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import type { Phase } from '../../../common/types';
import { createFormToggleAction } from './form_toggle_action';
import { createFormToggleAndSetValueAction } from './form_toggle_and_set_value_action';

export const createIndexPriorityActions = (phase: Phase) => {
  const toggleSelector = `${phase}-indexPrioritySwitch`;
  return {
    indexPriorityExists: () => Boolean(screen.queryByTestId(toggleSelector)),
    toggleIndexPriority: createFormToggleAction(toggleSelector),
    setIndexPriority: createFormToggleAndSetValueAction(toggleSelector, `${phase}-indexPriority`),
  };
};
