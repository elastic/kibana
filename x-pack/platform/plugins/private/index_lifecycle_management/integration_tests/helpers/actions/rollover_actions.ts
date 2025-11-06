/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { createFormToggleAction } from './form_toggle_action';
import { createFormSetValueAction } from './form_set_value_action';

// All action functions must be async (main-2co Pattern 2)
const setMaxPrimaryShardSize = async (value: string, units?: string) => {
  // Use getAllByTestId()[0] to handle duplicate test IDs (main-2co Pattern 6)
  const input = screen.getAllByTestId<HTMLInputElement>('hot-selectedMaxPrimaryShardSize')[0];
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);

  if (units) {
    // Use within() to scope queries instead of dot notation (main-2co Pattern 6)
    const popover = screen.getAllByTestId('hot-selectedMaxPrimaryShardSizeUnits')[0];
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

const setMaxAge = async (value: string, units?: string) => {
  // Use getAllByTestId()[0] to handle duplicate test IDs (main-2co Pattern 6)
  const input = screen.getAllByTestId<HTMLInputElement>('hot-selectedMaxAge')[0];
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);

  if (units) {
    // Use within() to scope queries instead of dot notation (main-2co Pattern 6)
    const popover = screen.getAllByTestId('hot-selectedMaxAgeUnits')[0];
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

const setMaxSize = async (value: string, units?: string) => {
  // Use getAllByTestId()[0] to handle duplicate test IDs (main-2co Pattern 6)
  const input = screen.getAllByTestId<HTMLInputElement>('hot-selectedMaxSizeStored')[0];
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);

  if (units) {
    // Use within() to scope queries instead of dot notation (main-2co Pattern 6)
    const popover = screen.getAllByTestId('hot-selectedMaxSizeStoredUnits')[0];
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

export const createRolloverActions = () => {
  return {
    rollover: {
      toggle: createFormToggleAction('rolloverSwitch'),
      toggleDefault: createFormToggleAction('useDefaultRolloverSwitch'),
      setMaxPrimaryShardSize,
      setMaxPrimaryShardDocs: createFormSetValueAction('hot-selectedMaxPrimaryShardDocs'),
      setMaxDocs: createFormSetValueAction('hot-selectedMaxDocuments'),
      setMaxAge,
      setMaxSize,
      hasSettingRequiredCallout: (): boolean =>
        Boolean(screen.queryByTestId('rolloverSettingsRequired')),
    },
  };
};
