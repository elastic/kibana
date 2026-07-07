/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ManageRegionsModal } from './manage_regions_modal';
import { useRegionPolicy } from '../../hooks/use_region_policy';
import { useSaveRegionPolicy } from '../../hooks/use_save_region_policy';
import { useEisModels } from '../../hooks/use_eis_models';
import * as eisUtils from '../../utils/eis_utils';

jest.mock('../../hooks/use_region_policy');
jest.mock('../../hooks/use_save_region_policy');
jest.mock('../../hooks/use_eis_models');
jest.mock('../../utils/eis_utils', () => ({
  ...jest.requireActual('../../utils/eis_utils'),
  getAvailableRegions: jest.fn(),
}));

const mockGetAvailableRegions = jest.mocked(eisUtils.getAvailableRegions);
const mockUseRegionPolicy = useRegionPolicy as jest.Mock;
const mockUseSaveRegionPolicy = useSaveRegionPolicy as jest.Mock;
const mockUseEisModels = useEisModels as jest.Mock;

const mockSaveMutate = jest.fn();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

// Two regions in different zones: North America and Europe
const twoTestRegions = [
  { csp: 'aws', region: 'us-east-1', geo: 'us' },
  { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
];

const endpointWithRegions = {
  inference_id: '.test-model',
  service: 'elastic' as const,
  task_type: 'text_embedding' as const,
  service_settings: { model_id: 'test-model' },
  metadata: {
    regions: twoTestRegions,
  },
};

describe('ManageRegionsModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: return the two test regions (real zone mappings apply via jest.requireActual)
    mockGetAvailableRegions.mockReturnValue(twoTestRegions);

    mockUseSaveRegionPolicy.mockReturnValue({
      mutate: mockSaveMutate,
      isLoading: false,
    });

    // Default hook returns — individual tests override as needed
    mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false, isError: false });
    mockUseEisModels.mockReturnValue({ data: [], isLoading: false, isError: false });
  });

  describe('loading state', () => {
    it('renders a loading spinner while region policy is fetching', () => {
      mockUseRegionPolicy.mockReturnValue({ data: undefined, isLoading: true });
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsLoading')).toBeInTheDocument();
    });

    it('renders a loading spinner while eis models are fetching', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: undefined, isLoading: true });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsLoading')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows a warning callout when no regions are available', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false });
      mockGetAvailableRegions.mockReturnValue([]);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsNoRegions')).toBeInTheDocument();
      expect(screen.getByText('No regions available')).toBeInTheDocument();
    });
  });

  describe('region accordion', () => {
    it('renders zone headers when regions are available from eis endpoints', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // us-east-1 → North America zone, europe-west1 → Europe zone
      expect(screen.getByTestId('manageRegionsZone-us')).toBeInTheDocument();
      expect(screen.getByTestId('manageRegionsZone-eu')).toBeInTheDocument();
      expect(screen.getByText('North America')).toBeInTheDocument();
      expect(screen.getByText('Europe')).toBeInTheDocument();
    });

    it('shows the correct "X of Y selected" summary', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // No policy → all regions selected by default
      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      });
    });

    it('pre-checks only the regions from the current policy', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] } },
        isLoading: false,
      });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Expand North America zone to see its checkboxes
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-us'));
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-eu'));

      await waitFor(() => {
        const usEast = screen.getByTestId(
          'manageRegionsCheckbox-aws::us-east-1'
        ) as HTMLInputElement;
        expect(usEast.checked).toBe(true);

        const euWest = screen.getByTestId(
          'manageRegionsCheckbox-gcp::europe-west1'
        ) as HTMLInputElement;
        expect(euWest.checked).toBe(false);
      });
    });

    it('defaults to all regions checked when there is no existing policy', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Expand both zones
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-us'));
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-eu'));

      await waitFor(() => {
        const usEast = screen.getByTestId(
          'manageRegionsCheckbox-aws::us-east-1'
        ) as HTMLInputElement;
        expect(usEast.checked).toBe(true);

        const euWest = screen.getByTestId(
          'manageRegionsCheckbox-gcp::europe-west1'
        ) as HTMLInputElement;
        expect(euWest.checked).toBe(true);
      });
    });

    it('toggles a region checkbox when clicked', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-us'));

      await waitFor(() => {
        const checkbox = screen.getByTestId(
          'manageRegionsCheckbox-aws::us-east-1'
        ) as HTMLInputElement;
        expect(checkbox.checked).toBe(true); // default = all selected
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        const checkbox = screen.getByTestId(
          'manageRegionsCheckbox-aws::us-east-1'
        ) as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
      });
    });
  });

  describe('Zone-level checkbox toggle', () => {
    it('unchecks all regions in a zone when zone checkbox is clicked while all are checked', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      });

      // Click North America zone checkbox — should uncheck us-east-1
      fireEvent.click(screen.getByTestId('manageRegionsZoneCheckbox-us'));

      await waitFor(() => {
        expect(screen.getByText('1 of 2 selected')).toBeInTheDocument();
      });
    });

    it('checks all regions in a zone when zone checkbox is clicked while none are checked', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Start by deselecting all
      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('manageRegionsSelectAllButton'));
      await waitFor(() => {
        expect(screen.getByText('0 of 2 selected')).toBeInTheDocument();
      });

      // Click North America zone checkbox — should check us-east-1
      fireEvent.click(screen.getByTestId('manageRegionsZoneCheckbox-us'));

      await waitFor(() => {
        expect(screen.getByText('1 of 2 selected')).toBeInTheDocument();
      });
    });
  });

  describe('Select all button', () => {
    it('deselects all when all are selected', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Default: all selected → button shows "Deselect all"
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSelectAllButton')).toHaveTextContent(
          'Deselect all'
        );
      });

      fireEvent.click(screen.getByTestId('manageRegionsSelectAllButton'));

      await waitFor(() => {
        expect(screen.getByText('0 of 2 selected')).toBeInTheDocument();
        expect(screen.getByTestId('manageRegionsSelectAllButton')).toHaveTextContent('Select all');
      });
    });
  });

  describe('Save preferences button', () => {
    it('is disabled when no changes have been made', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // All regions selected by default — nothing changed yet
      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      });

      expect(screen.getByTestId('manageRegionsSaveButton')).toBeDisabled();
    });

    it('calls savePolicy with only the checked regions when a subset is selected', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      mockSaveMutate.mockImplementation(
        (_body: unknown, { onSuccess }: { onSuccess: () => void }) => {
          onSuccess();
        }
      );

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Expand North America and uncheck us-east-1
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-us'));

      await waitFor(() => {
        const checkbox = screen.getByTestId(
          'manageRegionsCheckbox-aws::us-east-1'
        ) as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        const checkbox = screen.getByTestId(
          'manageRegionsCheckbox-aws::us-east-1'
        ) as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
      });

      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        { allowed_regions: [{ csp: 'gcp', region: 'europe-west1' }] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });
  });

  describe('Cancel button', () => {
    it('calls onClose when cancel is clicked', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsCancelButton'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Save button disabled state', () => {
    it('disables Save when all regions are deselected', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [endpointWithRegions], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      });

      // Deselect all via the "Deselect all" button
      fireEvent.click(screen.getByTestId('manageRegionsSelectAllButton'));

      await waitFor(() => {
        expect(screen.getByText('0 of 2 selected')).toBeInTheDocument();
      });

      expect(screen.getByTestId('manageRegionsSaveButton')).toBeDisabled();
    });
  });

  describe('error state', () => {
    it('renders a danger callout when the region policy fetch fails', () => {
      mockUseRegionPolicy.mockReturnValue({ data: undefined, isLoading: false, isError: true });
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false, isError: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsErrorCallout')).toBeInTheDocument();
      expect(screen.getByText('Failed to load region data')).toBeInTheDocument();
    });

    it('renders a danger callout when the EIS models fetch fails', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false, isError: false });
      mockUseEisModels.mockReturnValue({ data: undefined, isLoading: false, isError: true });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsErrorCallout')).toBeInTheDocument();
    });
  });

  describe('info callout', () => {
    it('renders the info callout by default', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsCallout')).toBeInTheDocument();
    });

    it('hides the callout after dismissal', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false });
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false });

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      const dismissButton = screen
        .getByTestId('manageRegionsCallout')
        .querySelector('[data-test-subj="euiDismissCalloutButton"]');
      expect(dismissButton).toBeTruthy();
      fireEvent.click(dismissButton!);

      expect(screen.queryByTestId('manageRegionsCallout')).not.toBeInTheDocument();
    });
  });
});
