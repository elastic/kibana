/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import type { Phase } from '../../../common/types';
import { createFormSetValueAction } from './form_set_value_action';

export const createMinAgeActions = (phase: Phase) => {
  return {
    hasMinAgeInput: () => Boolean(screen.queryByTestId(`${phase}-selectedMinimumAge`)),
    setMinAgeValue: createFormSetValueAction(`${phase}-selectedMinimumAge`),
    setMinAgeUnits: createFormSetValueAction(`${phase}-selectedMinimumAgeUnits`),
    hasRolloverTipOnMinAge: () =>
      Boolean(screen.queryByTestId(`${phase}-rolloverMinAgeInputIconTip`)),
  };
};
