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
  getAvailableGeos: jest.fn(),
}));

const mockGetAvailableRegions = jest.mocked(eisUtils.getAvailableRegions);
const mockGetAvailableGeos = jest.mocked(eisUtils.getAvailableGeos);
const mockUseRegionPolicy = jest.mocked(useRegionPolicy);
const mockUseSaveRegionPolicy = jest.mocked(useSaveRegionPolicy);
const mockUseEisModels = jest.mocked(useEisModels);

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
    mockGetAvailableGeos.mockReturnValue(['eu', 'us']);

    mockUseSaveRegionPolicy.mockReturnValue({
      mutate: mockSaveMutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useSaveRegionPolicy>);

    // Default hook returns — individual tests override as needed
    mockUseRegionPolicy.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useRegionPolicy>);
    mockUseEisModels.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useEisModels>);
  });

  describe('loading state', () => {
    it('renders a loading spinner while region policy is fetching', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<
        typeof useEisModels
      >);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageGeosLoading')).toBeInTheDocument();
    });

    it('renders a loading spinner while eis models are fetching', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageGeosLoading')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows a warning callout when no regions are available on Regions tab', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<
        typeof useEisModels
      >);
      mockGetAvailableRegions.mockReturnValue([]);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Default tab is Geo — switch to Regions to see the no-regions warning.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsNoRegions')).toBeInTheDocument();
        expect(screen.getByText('No regions available')).toBeInTheDocument();
      });
    });

    it('shows a warning callout when no geos are available on Geo tab', async () => {
      mockGetAvailableGeos.mockReturnValue([]);
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<
        typeof useEisModels
      >);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsGeoTab'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsNoGeos')).toBeInTheDocument();
      });
    });
  });

  describe('tabs', () => {
    it('renders Geo and Regions tabs', () => {
      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsGeoTab')).toBeInTheDocument();
      expect(screen.getByTestId('manageRegionsRegionsTab')).toBeInTheDocument();
    });

    it('defaults to Geo tab when no policy exists', async () => {
      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsGeoTab')).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('activates Geo tab when clicked', async () => {
      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsGeoTab'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsGeoTab')).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('defaults to Geo tab when policy has allowed_geos', async () => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsGeoTab')).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  describe('Geo tab content', () => {
    beforeEach(() => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
    });

    const renderWithGeoTab = () => {
      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );
      fireEvent.click(screen.getByTestId('manageRegionsGeoTab'));
    };

    it('renders geo zone rows for each available geo', async () => {
      renderWithGeoTab();

      await waitFor(() => {
        expect(screen.getByTestId('geoZoneRow-eu')).toBeInTheDocument();
        expect(screen.getByTestId('geoZoneRow-us')).toBeInTheDocument();
      });
    });

    it('shows all geo zones checked by default when there is no policy', async () => {
      renderWithGeoTab();

      await waitFor(() => {
        expect(screen.getByTestId('geoZoneCheckbox-eu')).toBeChecked();
        expect(screen.getByTestId('geoZoneCheckbox-us')).toBeChecked();
      });
    });

    it('pre-checks only the policy geos when an allowed_geos policy exists', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('geoZoneCheckbox-eu')).toBeChecked();
        expect(screen.getByTestId('geoZoneCheckbox-us')).not.toBeChecked();
      });
    });

    it('toggles a geo checkbox when clicked', async () => {
      renderWithGeoTab();

      await waitFor(() => {
        expect(screen.getByTestId('geoZoneCheckbox-eu')).toBeInTheDocument();
      });

      // No policy → starts checked (all routes allowed). Click to uncheck it.
      expect(screen.getByTestId('geoZoneCheckbox-eu')).toBeChecked();
      fireEvent.click(screen.getByTestId('geoZoneCheckbox-eu'));

      await waitFor(() => {
        expect(screen.getByTestId('geoZoneCheckbox-eu')).not.toBeChecked();
      });
    });

    it('shows "N of N selected" on the geo toolbar when no policy exists', async () => {
      renderWithGeoTab();

      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      });
    });
  });

  describe('region accordion', () => {
    it('renders zone headers when regions are available from eis endpoints', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Default tab is Geo — switch to Regions to see zone headers.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));

      // us-east-1 → North America zone, europe-west1 → Europe zone
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsZone-us')).toBeInTheDocument();
        expect(screen.getByTestId('manageRegionsZone-eu')).toBeInTheDocument();
        expect(screen.getByText('North America')).toBeInTheDocument();
        expect(screen.getByText('Europe')).toBeInTheDocument();
      });
    });

    it('shows "N of N selected" when there is no existing policy', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Default tab is Geo — switch to Regions to verify the regions toolbar count.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));

      // No policy → all regions pre-selected (no restrictions)
      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      });
    });

    it('shows "N of N selected" when the policy has all regions', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: {
          region_policy: {
            allowed_regions: [
              { csp: 'aws', region: 'us-east-1' },
              { csp: 'gcp', region: 'europe-west1' },
            ],
          },
          created_at: '2024-01-01T00:00:00Z',
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      });
    });

    it('pre-checks only the regions from the current policy', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: {
          region_policy: { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] },
          created_at: '2024-01-01T00:00:00Z',
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Expand North America zone to see its checkboxes
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-us'));
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-eu'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).toBeChecked();
        expect(screen.getByTestId('manageRegionsCheckbox-gcp::europe-west1')).not.toBeChecked();
      });
    });

    it('defaults to all regions checked when there is no existing policy', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Default tab is Geo — switch to Regions to inspect individual checkboxes.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsZoneToggle-us')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-us'));
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-eu'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).toBeChecked();
        expect(screen.getByTestId('manageRegionsCheckbox-gcp::europe-west1')).toBeChecked();
      });
    });

    it('toggles a region checkbox when clicked', async () => {
      // Seed a partial policy so us-east-1 starts checked.
      mockUseRegionPolicy.mockReturnValue({
        data: {
          region_policy: { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] },
          created_at: '2024-01-01T00:00:00Z',
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-us'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).toBeChecked();
        fireEvent.click(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).not.toBeChecked();
      });
    });
  });

  describe('Select all button', () => {
    it('shows "Deselect all" when all are selected, and deselects all on click', async () => {
      // No policy → all regions pre-selected.
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSelectAllButton')).toHaveTextContent(
          'Deselect all'
        );
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('manageRegionsSelectAllButton'));

      await waitFor(() => {
        expect(screen.getByText('0 of 2 selected')).toBeInTheDocument();
        expect(screen.getByTestId('manageRegionsSelectAllButton')).toHaveTextContent('Select all');
      });
    });

    it('deselects all when all are selected', async () => {
      // Seed a full policy so we start fully selected.
      mockUseRegionPolicy.mockReturnValue({
        data: {
          region_policy: {
            allowed_regions: [
              { csp: 'aws', region: 'us-east-1' },
              { csp: 'gcp', region: 'europe-west1' },
            ],
          },
          created_at: '2024-01-01T00:00:00Z',
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

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
    it('is disabled when an existing policy has not been changed', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: {
          region_policy: {
            allowed_regions: [
              { csp: 'aws', region: 'us-east-1' },
              { csp: 'gcp', region: 'europe-west1' },
            ],
          },
          created_at: '2024-01-01T00:00:00Z',
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Existing policy seeded → isDirty = false → Save disabled.
      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      });

      expect(screen.getByTestId('manageRegionsSaveButton')).toBeDisabled();
    });

    it('opens the confirmation modal when Save preferences is clicked', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Default tab is Geo — switch to Regions, expand US zone, uncheck a region to make dirty.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsZoneToggle-us')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-us'));
      await waitFor(() => {
        // No policy → all selected; uncheck us-east-1 to make isDirty = true.
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).toBeChecked();
        fireEvent.click(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSaveButton')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      await waitFor(() => {
        expect(screen.getByTestId('confirmRegionChangeModal')).toBeInTheDocument();
      });

      // mockSaveMutate not yet called — confirmation is pending
      expect(mockSaveMutate).not.toHaveBeenCalled();
    });

    it('calls savePolicy with only the checked regions after confirming', async () => {
      // Start with a full policy so we can uncheck one region.
      mockUseRegionPolicy.mockReturnValue({
        data: {
          region_policy: {
            allowed_regions: [
              { csp: 'aws', region: 'us-east-1' },
              { csp: 'gcp', region: 'europe-west1' },
            ],
          },
          created_at: '2024-01-01T00:00:00Z',
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

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
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).toBeChecked();
        fireEvent.click(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).not.toBeChecked();
      });

      // Click "Save preferences" → opens confirmation modal
      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      await waitFor(() => {
        expect(screen.getByTestId('confirmRegionChangeModal')).toBeInTheDocument();
      });

      // Click "Save" in confirmation modal → triggers actual save
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        { allowed_regions: [{ csp: 'gcp', region: 'europe-west1' }] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('closes the confirmation modal without saving when Cancel is clicked', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Default tab is Geo — switch to Regions to make a change there.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).toBeInTheDocument();
      });

      // Deselect a region to make the form dirty, then open confirmation.
      fireEvent.click(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1'));
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSaveButton')).not.toBeDisabled();
      });
      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      await waitFor(() => {
        expect(screen.getByTestId('confirmRegionChangeModal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

      await waitFor(() => {
        expect(screen.queryByTestId('confirmRegionChangeModal')).not.toBeInTheDocument();
      });

      expect(mockSaveMutate).not.toHaveBeenCalled();
    });
  });

  describe('parent modal onClose guard during confirmation', () => {
    it('routes parent onClose to handleCancelConfirmation while confirmation is open', async () => {
      // This test verifies that onClose={showConfirmation ? handleCancelConfirmation : onClose}
      // is wired correctly: dismissing the confirmation (via its Cancel button) does not
      // propagate to the outer onClose — the parent modal stays open.
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Default tab is Geo — uncheck a geo (all pre-selected) to make it dirty.
      await waitFor(() => {
        expect(screen.getByTestId('geoZoneCheckbox-eu')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('geoZoneCheckbox-eu'));
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSaveButton')).not.toBeDisabled();
      });
      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));
      await waitFor(() => {
        expect(screen.getByTestId('confirmRegionChangeModal')).toBeInTheDocument();
      });

      // Cancel the confirmation — this exercises the handleCancelConfirmation path.
      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

      await waitFor(() => {
        expect(screen.queryByTestId('confirmRegionChangeModal')).not.toBeInTheDocument();
      });

      // The parent modal must still be open and the outer onClose must NOT have fired.
      expect(screen.getByTestId('manageRegionsModal')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Geo tab save flow', () => {
    it('calls savePolicy with allowed_geos after confirming from Geo tab', async () => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu', 'us'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

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

      // Geo tab is active (policy has allowed_geos). Deselect 'eu' to make it dirty.
      await waitFor(() => {
        expect(screen.getByTestId('geoZoneCheckbox-eu')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('geoZoneCheckbox-eu'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSaveButton')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      await waitFor(() => {
        expect(screen.getByTestId('confirmRegionChangeModal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({ allowed_geos: ['us'] }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
      expect(mockSaveMutate).not.toHaveBeenCalledWith(
        expect.objectContaining({ allowed_regions: expect.anything() }),
        expect.anything()
      );
    });
  });

  describe('Cancel button', () => {
    it('calls onClose when cancel is clicked', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<
        typeof useEisModels
      >);

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
    it('is enabled when no policy exists (first-time setup)', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // No policy → isNewPolicy=true → Save enabled as long as at least 1 selected.
      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
        expect(screen.getByTestId('manageRegionsSaveButton')).not.toBeDisabled();
      });
    });

    it('is disabled when an existing policy has no changes', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu', 'us'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Existing policy seeded → isDirty = false → Save disabled.
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSaveButton')).toBeDisabled();
      });
    });

    it('disables Save only when no items are selected (first-time setup)', async () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({
        data: [endpointWithRegions],
        isLoading: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // No policy → Save enabled (first-time setup, all geos selected).
      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
        expect(screen.getByTestId('manageRegionsSaveButton')).not.toBeDisabled();
      });

      // Deselect all → totalGeosSelected=0 → Save disabled.
      fireEvent.click(screen.getByTestId('manageRegionsSelectAllButton'));
      await waitFor(() => {
        expect(screen.getByText('0 of 2 selected')).toBeInTheDocument();
        expect(screen.getByTestId('manageRegionsSaveButton')).toBeDisabled();
      });

      // Re-select all → Save enabled again.
      fireEvent.click(screen.getByTestId('manageRegionsSelectAllButton'));
      await waitFor(() => {
        expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
        expect(screen.getByTestId('manageRegionsSaveButton')).not.toBeDisabled();
      });
    });
  });

  describe('error state', () => {
    it('renders a danger callout when the region policy fetch fails', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockUseEisModels.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useEisModels>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsErrorCallout')).toBeInTheDocument();
      expect(screen.getByText('Failed to load region data')).toBeInTheDocument();
    });

    it('renders a danger callout when the EIS models fetch fails', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockUseEisModels.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as unknown as ReturnType<typeof useEisModels>);

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
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<
        typeof useEisModels
      >);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsCallout')).toBeInTheDocument();
    });

    it('hides the callout after dismissal', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
        typeof useRegionPolicy
      >);
      mockUseEisModels.mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<
        typeof useEisModels
      >);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      const dismissButton = screen
        .getByTestId('manageRegionsCallout')
        .querySelector('[data-test-subj="euiDismissCalloutButton"]');
      expect(dismissButton).not.toBeNull();
      if (!dismissButton) {
        return;
      }
      fireEvent.click(dismissButton);

      expect(screen.queryByTestId('manageRegionsCallout')).not.toBeInTheDocument();
    });
  });
});
