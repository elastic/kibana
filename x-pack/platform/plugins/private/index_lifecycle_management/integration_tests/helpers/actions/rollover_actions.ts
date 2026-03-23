/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within, waitForElementToBeRemoved } from '@testing-library/react';
import { createFormSetValueAction } from './form_set_value_action';

const setMaxPrimaryShardSize = async (value: string, units?: string) => {
  const input = screen.getByTestId<HTMLInputElement>('hot-selectedMaxPrimaryShardSize');
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);

  if (units) {
    const popover = screen.getByTestId('hot-selectedMaxPrimaryShardSizeUnits');
    const filterButton = within(popover).getByTestId('show-filters-button');
    fireEvent.click(filterButton);

    const filterOption = await screen.findByTestId(`filter-option-${units}`);
    fireEvent.click(filterOption);
    await waitForElementToBeRemoved(filterOption);
  }
};

const setMaxAge = async (value: string, units?: string) => {
  const input = screen.getByTestId<HTMLInputElement>('hot-selectedMaxAge');
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);

  if (units) {
    const popover = screen.getByTestId('hot-selectedMaxAgeUnits');
    const filterButton = within(popover).getByTestId('show-filters-button');
    fireEvent.click(filterButton);

    const filterOption = await screen.findByTestId(`filter-option-${units}`);
    fireEvent.click(filterOption);
    await waitForElementToBeRemoved(filterOption);
  }
};

const setMaxSize = async (value: string, units?: string) => {
  const input = screen.getByTestId<HTMLInputElement>('hot-selectedMaxSizeStored');
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);

  if (units) {
    const popover = screen.getByTestId('hot-selectedMaxSizeStoredUnits');
    const filterButton = within(popover).getByTestId('show-filters-button');
    fireEvent.click(filterButton);

    const filterOption = await screen.findByTestId(`filter-option-${units}`);
    fireEvent.click(filterOption);
    await waitForElementToBeRemoved(filterOption);
  }
};

export const createRolloverActions = () => {
  return {
    rollover: {
      toggle: () => fireEvent.click(screen.getByTestId('rolloverSwitch')),
      toggleDefault: () => fireEvent.click(screen.getByTestId('useDefaultRolloverSwitch')),
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
