/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import type { Phase } from '../../../common/types';
import { createFormSetValueAction } from './form_set_value_action';

export const createShrinkActions = (phase: Phase) => {
  const toggleShrinkSelector = `${phase}-shrinkSwitch`;
  const shrinkSizeSelector = `${phase}-primaryShardSize`;
  const shrinkCountSelector = `${phase}-primaryShardCount`;
  const allowWritesToggleSelector = `${phase}-allowWriteAfterShrink`;

  const changeShrinkRadioButton = async (selector: string) => {
    // Use getAllByTestId()[0] to handle duplicate test IDs (main-2co Pattern 6)
    const radioButton = screen.getAllByTestId(selector)[0].querySelector('input');
    if (radioButton) {
      await act(async () => {
        fireEvent.click(radioButton);
        await jest.runOnlyPendingTimersAsync();
      });
    }
  };

  const enableShrink = async () => {
    // Use getAllByTestId()[0] to handle duplicate test IDs (main-2co Pattern 6)
    const shrinkSwitch = screen.getAllByTestId(toggleShrinkSelector)[0];
    await act(async () => {
      fireEvent.click(shrinkSwitch);
      await jest.runOnlyPendingTimersAsync();
    });

    // Initialize isUsingShardSize to false (shard count mode) by default
    // This is required for the shrink fields to render (see shrink_field.tsx line 61)
    await act(async () => {
      await changeShrinkRadioButton(`${phase}-configureShardCount`);
    });
  };

  return {
    shrinkExists: () => Boolean(screen.queryByTestId(toggleShrinkSelector)),
    setShrinkCount: async (value: string) => {
      const shrinkCountExists = Boolean(screen.queryByTestId(shrinkCountSelector));
      const shrinkSizeExists = Boolean(screen.queryByTestId(shrinkSizeSelector));

      if (!shrinkCountExists && !shrinkSizeExists) {
        await enableShrink();
      }
      if (!shrinkCountExists) {
        await changeShrinkRadioButton(`${phase}-configureShardCount`);
      }
      await createFormSetValueAction(shrinkCountSelector)(value);
    },
    setShrinkSize: async (value: string) => {
      const shrinkCountExists = Boolean(screen.queryByTestId(shrinkCountSelector));
      const shrinkSizeExists = Boolean(screen.queryByTestId(shrinkSizeSelector));

      if (!shrinkCountExists && !shrinkSizeExists) {
        await enableShrink();
      }
      if (!shrinkSizeExists) {
        await changeShrinkRadioButton(`${phase}-configureShardSize`);
      }
      await createFormSetValueAction(shrinkSizeSelector)(value);
    },
    toggleAllowWriteAfterShrink: async () => {
      if (!screen.queryByTestId(allowWritesToggleSelector)) {
        await enableShrink();
      }
      // Use getAllByTestId()[0] to handle duplicate test IDs (main-2co Pattern 6)
      const allowWritesSwitch = screen.getAllByTestId(allowWritesToggleSelector)[0];
      fireEvent.click(allowWritesSwitch);
    },
  };
};
