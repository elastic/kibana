/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Phase } from '../../../common/types';

export const createSearchableSnapshotActions = (phase: Phase) => {
  const fieldSelector = `searchableSnapshotField-${phase}`;

  // Use within() to scope queries instead of dot notation (main-2co Pattern 6)
  const getFieldContainer = () => {
    const containers = screen.queryAllByTestId(fieldSelector);
    return containers.length > 0 ? containers[0] : null;
  };

  const flushPromises = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  const openPhaseAdvancedSettings = async () => {
    const phaseContainers = screen.queryAllByTestId(`${phase}-phase`);
    if (phaseContainers.length === 0) {
      return;
    }
    const advancedButton = within(phaseContainers[0]).queryByRole('button', {
      name: /advanced settings/i,
    }) as HTMLButtonElement | null;
    if (advancedButton && advancedButton.getAttribute('aria-expanded') !== 'true') {
      fireEvent.click(advancedButton);
      await flushPromises();
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    }
  };
  const ensurePhasePreconditions = async () => {
    if (phase === 'hot') {
      const defaultSwitches = screen.queryAllByTestId(
        'useDefaultRolloverSwitch'
      ) as HTMLButtonElement[];
      const defaultSwitch = defaultSwitches[0];
      if (defaultSwitch && defaultSwitch.getAttribute('aria-checked') !== 'true') {
        fireEvent.click(defaultSwitch);
        await flushPromises();
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });
      }
      const rolloverSwitches = screen.queryAllByTestId('rolloverSwitch') as HTMLButtonElement[];
      const rolloverSwitch = rolloverSwitches[0];
      if (rolloverSwitch && rolloverSwitch.getAttribute('aria-checked') !== 'true') {
        fireEvent.click(rolloverSwitch);
        await flushPromises();
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });
      }
    }

    if (phase !== 'delete') {
      const phaseSwitches = screen.queryAllByTestId(`enablePhaseSwitch-${phase}`) as
        | HTMLButtonElement[]
        | [];
      if (phaseSwitches.length > 0) {
        const phaseSwitch = phaseSwitches[0];
        if (phaseSwitch.getAttribute('aria-checked') !== 'true') {
          fireEvent.click(phaseSwitch);
          await flushPromises();
          await act(async () => {
            await jest.runOnlyPendingTimersAsync();
          });
        }
      }
    }

    await openPhaseAdvancedSettings();
  };

  const waitForFieldContainer = async () => {
    // First, try a few quick attempts without preconditions (for tests with fresh setup)
    let container = getFieldContainer();
    let quickAttempts = 0;

    while (!container && quickAttempts < 3) {
      await flushPromises();
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
      container = getFieldContainer();
      quickAttempts++;
    }

    // If still not found, try ensuring preconditions (for tests using shared beforeEach)
    let attempts = 0;
    while (!container && attempts < 10) {
      await ensurePhasePreconditions();
      if (phase === 'cold' || phase === 'frozen') {
        const minAgeInputs = screen.queryAllByTestId(`${phase}-selectedMinAge`);
        if (minAgeInputs.length > 0) {
          const input = minAgeInputs[0] as HTMLInputElement;
          if (!input.value) {
            fireEvent.change(input, { target: { value: '1' } });
            fireEvent.blur(input);
            await flushPromises();
            await act(async () => {
              await jest.runOnlyPendingTimersAsync();
            });
          }
        }
      }
      await flushPromises();
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
      container = getFieldContainer();
      attempts++;
    }

    if (!container) {
      const availableFields = Array.from(
        document.querySelectorAll("[data-test-subj^='searchableSnapshotField-']"),
        (el) => el.getAttribute('data-test-subj')
      );
      throw new Error(
        `Container ${fieldSelector} not found after ${
          quickAttempts + attempts
        } attempts. Available fields: ${JSON.stringify(availableFields)}`
      );
    }

    return container;
  };

  const waitForCombobox = async (container: HTMLElement) => {
    let combobox = within(container).queryByTestId(
      'searchableSnapshotCombobox'
    ) as HTMLInputElement | null;
    let attempts = 0;

    while (!combobox && attempts < 10) {
      await flushPromises();
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
      combobox = within(container).queryByTestId(
        'searchableSnapshotCombobox'
      ) as HTMLInputElement | null;
      attempts++;
    }

    if (!combobox) {
      throw new Error(`Combobox searchableSnapshotCombobox not found for ${fieldSelector}`);
    }

    return combobox;
  };

  const toggleSearchableSnapshot = async () => {
    const container = await waitForFieldContainer();
    const toggle = within(container).queryByTestId('searchableSnapshotToggle');

    // Frozen phase cannot disable the field so the toggle is absent. No action required.
    if (!toggle) {
      return;
    }

    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });

    await user.click(toggle);
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    await flushPromises();
  };

  return {
    searchableSnapshotDisabledDueToLicense: () => {
      const container = getFieldContainer();
      if (!container) return false;
      const licenseCallout = within(container).queryByTestId(
        'searchableSnapshotDisabledDueToLicense'
      );
      const toggle = within(container).queryByTestId(
        'searchableSnapshotToggle'
      ) as HTMLButtonElement | null;
      return Boolean(licenseCallout && toggle?.disabled);
    },
    searchableSnapshotsExists: () => Boolean(screen.queryByTestId(fieldSelector)),
    toggleSearchableSnapshot,
    setSearchableSnapshot: async (value: string) => {
      let container = getFieldContainer();

      if (!container) {
        container = await waitForFieldContainer();
      }

      let combobox = within(container).queryByTestId(
        'searchableSnapshotCombobox'
      ) as HTMLInputElement | null;

      if (!combobox) {
        await toggleSearchableSnapshot();
        container = await waitForFieldContainer();
        combobox = within(container).queryByTestId(
          'searchableSnapshotCombobox'
        ) as HTMLInputElement | null;
      }

      if (!combobox) {
        combobox = await waitForCombobox(container);
      }

      const user = userEvent.setup({
        advanceTimers: jest.advanceTimersByTime,
        pointerEventsCheck: 0,
      });

      await user.click(combobox);
      await user.clear(combobox);

      if (value !== '') {
        await user.type(combobox, value);
        fireEvent.keyDown(combobox, { key: 'Enter', code: 'Enter', keyCode: 13 });
      }

      await flushPromises();
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    },
  };
};
