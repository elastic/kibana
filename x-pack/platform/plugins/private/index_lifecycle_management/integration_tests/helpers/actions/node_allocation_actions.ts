/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  screen,
  fireEvent,
  within,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { EuiSelectTestHarness } from '@kbn/test-eui-helpers';

import type { DataTierAllocationType } from '../../../public/application/sections/edit_policy/types';
import type { Phase } from '../../../common/types';

export const createNodeAllocationActions = (phase: Phase) => {
  const controlsSelector = `${phase}-dataTierAllocationControls`;
  const nodeAttrsSelector = `${phase}-selectedNodeAttrs`;

  const openNodeAttributesSection = async () => {
    // Find the controls container and query within it
    const container = screen.getByTestId(controlsSelector);
    const select = within(container).getByTestId('dataTierSelect');
    fireEvent.click(select);

    // Wait for dropdown portal options to appear (always wait for custom/none which are always available)
    await waitFor(() => {
      const customOption = screen.queryByTestId('customDataAllocationOption');
      const noneOption = screen.queryByTestId('noneDataAllocationOption');
      if (!customOption && !noneOption) {
        throw new Error('Dropdown options (custom/none) did not appear');
      }
    });
  };

  const getPhaseContainer = () => {
    return screen.queryByTestId(`${phase}-phase`);
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
    const element = within(container).queryByTestId('willUseFallbackTierNotice');
    return element?.textContent || '';
  };

  return {
    hasDataTierAllocationControls: () => Boolean(screen.queryByTestId(controlsSelector)),
    openNodeAttributesSection,
    hasNodeAttributesSelect: (): boolean =>
      Boolean(new EuiSelectTestHarness(nodeAttrsSelector).getElement()),
    getNodeAttributesSelectOptions: () => new EuiSelectTestHarness(nodeAttrsSelector).getOptions(),
    setDataAllocation: async (value: DataTierAllocationType) => {
      await openNodeAttributesSection();

      switch (value) {
        case 'node_roles': {
          const option = screen.getByTestId('defaultDataAllocationOption');
          fireEvent.click(option);
          await waitForElementToBeRemoved(option);
          break;
        }
        case 'node_attrs': {
          const customOption = screen.getByTestId('customDataAllocationOption');
          fireEvent.click(customOption);
          await waitForElementToBeRemoved(customOption);
          break;
        }
        default:
          const option = screen.getByTestId('noneDataAllocationOption');
          fireEvent.click(option);
          await waitForElementToBeRemoved(option);
      }
    },
    setSelectedNodeAttribute: async (value: string) => {
      // Wait for the node attribute select field to appear AND be populated with options
      // The field only renders when dataTierAllocationType === 'node_attrs'
      await waitFor(() => {
        const selectHarness = new EuiSelectTestHarness(nodeAttrsSelector);
        expect(selectHarness.getElement()).toBeInTheDocument();

        // Check if options are loaded (more than just the empty default option)
        const options = selectHarness
          .getOptions()
          .map((o) => o.value)
          .filter((v) => v !== '');
        if (options.length === 0) {
          throw new Error('Options not yet loaded');
        }
        if (!options.includes(value)) {
          throw new Error(
            `Option '${value}' not found. Available options: ${JSON.stringify(options)}`
          );
        }
      });

      // Field found and options loaded, set the value
      const selectHarness = new EuiSelectTestHarness(nodeAttrsSelector);
      selectHarness.select(value);
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
    hasNodeDetailsFlyout: () => Boolean(screen.queryByRole('dialog')),
    openNodeDetailsFlyout: async () => {
      const button = screen.getByTestId(`${phase}-viewNodeDetailsFlyoutButton`);
      fireEvent.click(button);

      // Wait for flyout portal to mount
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    },
  };
};
