/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import type { Phase } from '../../../common/types';
import { createFormToggleAction } from '..';

// All action functions must be async (main-2co Pattern 2)
const createSetDownsampleIntervalAction =
  (phase: Phase) => async (value: string, units?: string) => {
    // Use getAllByTestId()[0] to handle duplicate test IDs (main-2co Pattern 6)
    const input = screen.getAllByTestId<HTMLInputElement>(`${phase}-downsampleFixedInterval`)[0];
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);

    if (units) {
      // Use within() to scope queries instead of dot notation (main-2co Pattern 6)
      const popover = screen.getAllByTestId(`${phase}-downsampleFixedIntervalUnits`)[0];
      const filterButton = within(popover).getByTestId('show-filters-button');
      fireEvent.click(filterButton);

      // Component state stabilization (main-2co Pattern 4)
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      // Options are in a portal, query on screen
      const filterOption = screen.getAllByTestId(`filter-option-${units}`)[0];
      fireEvent.click(filterOption);
    }
  };

export const createDownsampleActions = (phase: Phase) => {
  return {
    downsample: {
      exists: () => Boolean(screen.queryByTestId(`${phase}-downsampleSwitch`)),
      toggle: createFormToggleAction(`${phase}-downsampleSwitch`),
      setDownsampleInterval: createSetDownsampleIntervalAction(phase),
    },
  };
};
