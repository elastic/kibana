/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import type { Phase } from '../../../common/types';
import { createFormSetValueAction } from './form_set_value_action';

export const createShrinkActions = (phase: Phase) => {
  const toggleShrinkSelector = `${phase}-shrinkSwitch`;
  const shrinkSizeSelector = `${phase}-primaryShardSize`;
  const shrinkCountSelector = `${phase}-primaryShardCount`;
  const allowWritesToggleSelector = `${phase}-allowWriteAfterShrink`;

  const changeShrinkRadioButton = async (selector: string) => {
    const radioButton = screen.getByTestId(selector).querySelector('input');
    if (radioButton) {
      fireEvent.click(radioButton);

      // Wait for the corresponding field to appear
      const isShardSize = selector.includes('ShardSize');
      const expectedField = isShardSize ? shrinkSizeSelector : shrinkCountSelector;
      await waitFor(() => {
        expect(screen.getByTestId(expectedField)).toBeInTheDocument();
      });
    }
  };

  const enableShrink = async () => {
    const shrinkSwitch = screen.getByTestId(toggleShrinkSelector);
    fireEvent.click(shrinkSwitch);

    // Wait for shrink options to appear
    await waitFor(() => {
      expect(screen.getByTestId(`${phase}-configureShardCount`)).toBeInTheDocument();
    });

    // Initialize isUsingShardSize to false (shard count mode) by default
    // This is required for the shrink fields to render (see shrink_field.tsx line 61)
    await changeShrinkRadioButton(`${phase}-configureShardCount`);
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
      const allowWritesSwitch = screen.getByTestId(allowWritesToggleSelector);
      fireEvent.click(allowWritesSwitch);
    },
  };
};
