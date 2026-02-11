/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within, waitForElementToBeRemoved } from '@testing-library/react';
import type { Phase } from '../../../common/types';

const createSetDownsampleIntervalAction =
  (phase: Phase) => async (value: string, units?: string) => {
    const input = screen.getByTestId<HTMLInputElement>(`${phase}-downsampleFixedInterval`);
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);

    if (units) {
      const popover = screen.getByTestId(`${phase}-downsampleFixedIntervalUnits`);
      const filterButton = within(popover).getByTestId('show-filters-button');
      fireEvent.click(filterButton);

      const filterOption = await screen.findByTestId(`filter-option-${units}`);
      fireEvent.click(filterOption);
      await waitForElementToBeRemoved(filterOption);
    }
  };

export const createDownsampleActions = (phase: Phase) => {
  return {
    downsample: {
      exists: () => Boolean(screen.queryByTestId(`${phase}-downsampleSwitch`)),
      toggle: () => fireEvent.click(screen.getByTestId(`${phase}-downsampleSwitch`)),
      setDownsampleInterval: createSetDownsampleIntervalAction(phase),
    },
  };
};
