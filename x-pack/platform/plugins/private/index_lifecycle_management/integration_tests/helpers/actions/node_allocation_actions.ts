/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

import type { DataTierAllocationType } from '../../../public/application/sections/edit_policy/types';
import type { Phase } from '../../../common/types';
import { createFormSetValueAction } from './form_set_value_action';

export const createNodeAllocationActions = (phase: Phase) => {
  const controlsSelector = `${phase}-dataTierAllocationControls`;
  const nodeAttrsSelector = `${phase}-selectedNodeAttrs`;

  const openNodeAttributesSection = async () => {
    // Find the controls container and query within it
    const containers = screen.getAllByTestId(controlsSelector);
    const container = containers[0];
    const select = within(container).getByTestId('dataTierSelect');

    // Wrap in act() like original Enzyme version did
    await act(async () => {
      fireEvent.click(select);
      await Promise.resolve(); // Allow React to process the click
    });

    // Wait for dropdown portal to appear (options are rendered in a portal)
    // Use timer advancement instead of waitFor (which conflicts with fake timers)
    // Always wait for custom/none options which are always available
    // Don't wait for default option as it may be filtered out by component logic
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    // Give React another tick for portal to render
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    // Verify options appeared (throw if they didn't, similar to waitFor behavior)
    const customOption = screen.queryByTestId('customDataAllocationOption');
    const noneOption = screen.queryByTestId('noneDataAllocationOption');
    if (!customOption && !noneOption) {
      throw new Error('Dropdown options (custom/none) did not appear');
    }
  };

  const getPhaseContainer = () => {
    // Handle potential duplicates - get the first match
    const containers = screen.queryAllByTestId(`${phase}-phase`);
    return containers.length > 0 ? containers[0] : null;
  };

  const isAllocationLoading = () => {
    // The spinner is within the phase container
    const container = getPhaseContainer();
    if (!container) return false;
    return Boolean(within(container).queryByTestId('allocationLoadingSpinner'));
  };

  const hasDefaultToDataNodesNotice = () => {
    const container = getPhaseContainer();
    return container ? Boolean(within(container).queryByTestId('defaultToDataNodesNotice')) : false;
  };
  const hasDefaultToDataTiersNotice = () => {
    const container = getPhaseContainer();
    return container ? Boolean(within(container).queryByTestId('defaultToDataTiersNotice')) : false;
  };
  const hasDefaultAllocationBehaviorNotice = () =>
    hasDefaultToDataNodesNotice() && hasDefaultToDataTiersNotice();
  const hasNoTiersAvailableNotice = () => {
    const container = getPhaseContainer();
    return container ? Boolean(within(container).queryByTestId('noTiersAvailableNotice')) : false;
  };
  const hasNoTiersAvailableUsingNodeAttributesNotice = () => {
    const container = getPhaseContainer();
    return container
      ? Boolean(within(container).queryByTestId('noTiersAvailableUsingNodeAttributesNotice'))
      : false;
  };
  const hasWillUseFallbackTierNotice = () => {
    const container = getPhaseContainer();
    return container
      ? Boolean(within(container).queryByTestId('willUseFallbackTierNotice'))
      : false;
  };
  const hasWillUseFallbackTierUsingNodeAttributesNotice = () => {
    const container = getPhaseContainer();
    return container
      ? Boolean(within(container).queryByTestId('willUseFallbackTierUsingNodeAttributesNotice'))
      : false;
  };
  const getWillUseFallbackTierNoticeText = () => {
    const container = getPhaseContainer();
    if (!container) return '';
    const elements = within(container).queryAllByTestId('willUseFallbackTierNotice');
    return elements[0]?.textContent || '';
  };

  return {
    hasDataTierAllocationControls: () => Boolean(screen.queryByTestId(controlsSelector)),
    openNodeAttributesSection,
    hasNodeAttributesSelect: (): boolean => Boolean(screen.queryByTestId(nodeAttrsSelector)),
    getNodeAttributesSelectOptions: () => {
      const selects = screen.getAllByTestId(nodeAttrsSelector);
      return within(selects[0]).queryAllByRole('option');
    },
    setDataAllocation: async (value: DataTierAllocationType) => {
      await openNodeAttributesSection();

      // Options may be in a portal/popover, so query on screen
      // Use getAllByTestId to handle duplicates
      switch (value) {
        case 'node_roles':
          fireEvent.click(screen.getAllByTestId('defaultDataAllocationOption')[0]);
          break;
        case 'node_attrs':
          await act(async () => {
            fireEvent.click(screen.getAllByTestId('customDataAllocationOption')[0]);
            // Wait for popover to close and form to update
            await jest.runOnlyPendingTimersAsync();
          });
          // Wait for node attribute select field to appear after form updates
          await act(async () => {
            await jest.runOnlyPendingTimersAsync();
          });
          break;
        default:
          fireEvent.click(screen.getAllByTestId('noneDataAllocationOption')[0]);
      }
    },
    setSelectedNodeAttribute: async (value: string) => {
      // Wait for the node attribute select field to appear AND be populated with options
      // The field only renders when dataTierAllocationType === 'node_attrs'
      let attempts = 0;
      let lastOptions: string[] = [];
      while (attempts < 10) {
        const selects = screen.queryAllByTestId(nodeAttrsSelector);
        if (selects.length > 0) {
          const select = selects[0] as HTMLSelectElement;
          // Check if options are loaded (more than just the empty default option)
          const options = Array.from(select.querySelectorAll('option'))
            .map((o) => o.value)
            .filter((v) => v !== '');
          lastOptions = options;
          if (options.length > 0 && options.includes(value)) {
            // Field found and options loaded, set the value
            await createFormSetValueAction(nodeAttrsSelector)(value);
            return;
          }
        }
        // Field not ready yet, wait and try again
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });
        attempts++;
      }
      throw new Error(
        `Node attribute select field '${nodeAttrsSelector}' with option '${value}' not found after ${attempts} attempts. Available options: ${JSON.stringify(
          lastOptions
        )}`
      );
    },
    isAllocationLoading,
    hasDefaultToDataNodesNotice,
    hasDefaultToDataTiersNotice,
    hasDefaultAllocationBehaviorNotice,
    hasNoTiersAvailableNotice,
    hasNoTiersAvailableUsingNodeAttributesNotice,
    hasWillUseFallbackTierNotice,
    hasWillUseFallbackTierUsingNodeAttributesNotice,
    getWillUseFallbackTierNoticeText,
    hasNodeDetailsFlyout: () =>
      Boolean(screen.queryByTestId(`${phase}-viewNodeDetailsFlyoutButton`)),
    openNodeDetailsFlyout: () => {
      const buttons = screen.getAllByTestId(`${phase}-viewNodeDetailsFlyoutButton`);
      fireEvent.click(buttons[0]);
    },
  };
};
