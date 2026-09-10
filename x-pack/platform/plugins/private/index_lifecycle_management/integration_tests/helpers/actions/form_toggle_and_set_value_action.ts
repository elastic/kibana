/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import { createFormSetValueAction } from './form_set_value_action';

export const createFormToggleAndSetValueAction =
  (toggleSelector: string, inputSelector: string) => async (value: string) => {
    if (!screen.queryByTestId(inputSelector)) {
      fireEvent.click(screen.getByTestId(toggleSelector));
    }
    await createFormSetValueAction(inputSelector)(value);
  };
