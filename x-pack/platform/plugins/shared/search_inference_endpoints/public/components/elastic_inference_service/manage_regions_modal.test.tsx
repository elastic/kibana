/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ManageRegionsModal } from './manage_regions_modal';
import { useRegionPolicy } from '../../hooks/use_region_policy';
import { useSaveRegionPolicy } from '../../hooks/use_save_region_policy';
import { useDeleteRegionPolicy } from '../../hooks/use_delete_region_policy';
import { useEisModels } from '../../hooks/use_eis_models';
import * as eisUtils from '../../utils/eis_utils';

jest.mock('../../hooks/use_region_policy');
jest.mock('../../hooks/use_save_region_policy');
jest.mock('../../hooks/use_delete_region_policy');
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
const mockUseDeleteRegionPolicy = jest.mocked(useDeleteRegionPolicy);
const mockUseEisModels = jest.mocked(useEisModels);

const mockSaveMutate = jest.fn();
const mockDeleteMutate = jest.fn();
let capturedDeleteOnSuccess: (() => void) | undefined;

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

const toggleCustomPolicyOn = () => {
  fireEvent.click(screen.getByTestId('manageRegionsCustomPolicyToggle'));
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

    capturedDeleteOnSuccess = undefined;
    mockUseDeleteRegionPolicy.mockImplementation((onSuccess) => {
      capturedDeleteOnSuccess = onSuccess;
      return {
        mutate: mockDeleteMutate,
        isLoading: false,
      } as unknown as ReturnType<typeof useDeleteRegionPolicy>;
    });

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

      expect(screen.getByTestId('manageRegionsCustomPolicyToggle')).toBeDisabled();
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

      toggleCustomPolicyOn();
      // Default tab is Geo — switch to Regions to see the no-regions warning.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsNoRegions')).toHaveTextContent(
          'No regions available'
        );
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

      toggleCustomPolicyOn();
      fireEvent.click(screen.getByTestId('manageRegionsGeoTab'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsNoGeos')).toBeInTheDocument();
      });
    });
  });

  describe('custom-policy toggle', () => {
    it('hides the tabs when the toggle is OFF (no existing policy)', () => {
      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.queryByTestId('manageRegionsGeoTab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('manageRegionsRegionsTab')).not.toBeInTheDocument();
    });

    it('reveals the tabs when the toggle is clicked ON', () => {
      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      toggleCustomPolicyOn();

      expect(screen.getByTestId('manageRegionsGeoTab')).toBeInTheDocument();
      expect(screen.getByTestId('manageRegionsRegionsTab')).toBeInTheDocument();
    });

    it('shows the tabs by default when an existing policy is loaded', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      expect(screen.getByTestId('manageRegionsGeoTab')).toBeInTheDocument();
      expect(screen.getByTestId('manageRegionsRegionsTab')).toBeInTheDocument();
    });

    it('hides the tabs when the toggle is turned OFF on an existing policy', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsCustomPolicyToggle'));

      expect(screen.queryByTestId('manageRegionsGeoTab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('manageRegionsRegionsTab')).not.toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('renders Geo and Regions tabs when the toggle is ON', () => {
      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      toggleCustomPolicyOn();

      expect(screen.getByTestId('manageRegionsGeoTab')).toBeInTheDocument();
      expect(screen.getByTestId('manageRegionsRegionsTab')).toBeInTheDocument();
    });

    it('defaults to Geo tab when no policy exists', async () => {
      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      toggleCustomPolicyOn();

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

      toggleCustomPolicyOn();
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
      toggleCustomPolicyOn();
      fireEvent.click(screen.getByTestId('manageRegionsGeoTab'));
    };

    it('renders geo zone rows for each available geo', async () => {
      renderWithGeoTab();

      await waitFor(() => {
        expect(screen.getByTestId('geoZoneRow-eu')).toBeInTheDocument();
        expect(screen.getByTestId('geoZoneRow-us')).toBeInTheDocument();
      });
    });

    it('shows no geo zones checked by default when there is no policy', async () => {
      renderWithGeoTab();

      await waitFor(() => {
        expect(screen.getByTestId('geoZoneCheckbox-eu')).not.toBeChecked();
        expect(screen.getByTestId('geoZoneCheckbox-us')).not.toBeChecked();
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

      // No policy → starts unchecked. Click to check it.
      expect(screen.getByTestId('geoZoneCheckbox-eu')).not.toBeChecked();
      fireEvent.click(screen.getByTestId('geoZoneCheckbox-eu'));

      await waitFor(() => {
        expect(screen.getByTestId('geoZoneCheckbox-eu')).toBeChecked();
      });
    });

    it('shows "0 of N selected" on the geo toolbar when no policy exists', async () => {
      renderWithGeoTab();

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '0 of 2 selected'
        );
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

      toggleCustomPolicyOn();
      // Default tab is Geo — switch to Regions to see zone headers.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));

      // us-east-1 → North America zone, europe-west1 → Europe zone
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsZone-us')).toHaveTextContent('North America');
        expect(screen.getByTestId('manageRegionsZone-eu')).toHaveTextContent('Europe');
      });
    });

    it('expands a zone when the region count text/icon is clicked', async () => {
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

      toggleCustomPolicyOn();
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsZoneCountToggle-us')).toBeInTheDocument();
      });

      // Clicking the count/icon button (not the zone title) should expand the zone.
      fireEvent.click(screen.getByTestId('manageRegionsZoneCountToggle-us'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).toBeInTheDocument();
      });
    });

    it('shows "0 of N selected" when there is no existing policy', async () => {
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

      toggleCustomPolicyOn();
      // Default tab is Geo — switch to Regions to verify the regions toolbar count.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));

      // No policy → nothing pre-selected
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '0 of 2 selected'
        );
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
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '2 of 2 selected'
        );
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

    it('defaults to no regions checked when there is no existing policy', async () => {
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

      toggleCustomPolicyOn();
      // Default tab is Geo — switch to Regions to inspect individual checkboxes.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsZoneToggle-us')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-us'));
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-eu'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).not.toBeChecked();
        expect(screen.getByTestId('manageRegionsCheckbox-gcp::europe-west1')).not.toBeChecked();
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
    it('shows "Select all" when none are selected, and selects all on click', async () => {
      // No policy → nothing pre-selected.
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

      toggleCustomPolicyOn();

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSelectAllButton')).toHaveTextContent('Select all');
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '0 of 2 selected'
        );
      });

      fireEvent.click(screen.getByTestId('manageRegionsSelectAllButton'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '2 of 2 selected'
        );
        expect(screen.getByTestId('manageRegionsSelectAllButton')).toHaveTextContent(
          'Deselect all'
        );
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
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '0 of 2 selected'
        );
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
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '2 of 2 selected'
        );
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

      toggleCustomPolicyOn();
      // Default tab is Geo — switch to Regions, expand US zone, check a region so Save is enabled.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsZoneToggle-us')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('manageRegionsZoneToggle-us'));
      await waitFor(() => {
        // No policy → nothing selected; check us-east-1 so a selection exists.
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).not.toBeChecked();
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

      toggleCustomPolicyOn();
      // Default tab is Geo — switch to Regions to make a change there.
      fireEvent.click(screen.getByTestId('manageRegionsRegionsTab'));
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).toBeInTheDocument();
      });

      // Select a region to make the form dirty, then open confirmation.
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

      toggleCustomPolicyOn();
      // Default tab is Geo — check a geo (none pre-selected) to make it dirty.
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

  describe('delete policy flow', () => {
    it('opens the delete confirmation when the toggle is turned OFF and Save is clicked', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      // Existing policy → toggle ON by default. Turn it OFF.
      fireEvent.click(screen.getByTestId('manageRegionsCustomPolicyToggle'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSaveButton')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      await waitFor(() => {
        expect(screen.getByTestId('confirmDeleteRegionPolicyModal')).toBeInTheDocument();
      });

      expect(mockDeleteMutate).not.toHaveBeenCalled();
    });

    it('does not delete the policy until the acknowledge checkbox is ticked', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsCustomPolicyToggle'));
      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      await waitFor(() => {
        expect(screen.getByTestId('confirmDeleteRegionPolicyModal')).toBeInTheDocument();
      });

      // Confirm button is disabled until acknowledgement.
      const confirmButton = screen.getByTestId('confirmModalConfirmButton');
      expect(confirmButton).toBeDisabled();

      fireEvent.click(screen.getByTestId('confirmDeleteRegionPolicyAcknowledge'));

      expect(confirmButton).toBeEnabled();
      fireEvent.click(confirmButton);

      expect(mockDeleteMutate).toHaveBeenCalledWith();
    });

    it('cancels the delete confirmation without deleting and leaves the parent modal open', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsCustomPolicyToggle'));
      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      const deleteConfirm = await screen.findByTestId('confirmDeleteRegionPolicyModal');

      // Scope the cancel lookup to the delete confirmation, otherwise the
      // parent modal's own Cancel button would also match.
      fireEvent.click(within(deleteConfirm).getByTestId('confirmModalCancelButton'));

      await waitFor(() => {
        expect(screen.queryByTestId('confirmDeleteRegionPolicyModal')).not.toBeInTheDocument();
      });

      expect(mockDeleteMutate).not.toHaveBeenCalled();
      expect(screen.getByTestId('manageRegionsModal')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes both modals when delete succeeds', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockDeleteMutate.mockImplementation(() => capturedDeleteOnSuccess?.());

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsCustomPolicyToggle'));
      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      await waitFor(() => {
        expect(screen.getByTestId('confirmDeleteRegionPolicyModal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirmDeleteRegionPolicyAcknowledge'));
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('keeps the delete confirmation and parent modal open when delete fails', async () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      // Simulate a failed mutation: no onSuccess callback is invoked.
      mockDeleteMutate.mockImplementation(() => {});

      render(
        <Wrapper>
          <ManageRegionsModal onClose={onClose} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('manageRegionsCustomPolicyToggle'));
      fireEvent.click(screen.getByTestId('manageRegionsSaveButton'));

      await waitFor(() => {
        expect(screen.getByTestId('confirmDeleteRegionPolicyModal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirmDeleteRegionPolicyAcknowledge'));
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(mockDeleteMutate).toHaveBeenCalled();
      expect(screen.getByTestId('confirmDeleteRegionPolicyModal')).toBeInTheDocument();
      expect(screen.getByTestId('manageRegionsModal')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
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
    it('is disabled when no policy exists and the toggle is OFF (first-time default)', async () => {
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

      // No policy → toggle OFF → nothing to save yet.
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSaveButton')).toBeDisabled();
      });
    });

    it('is disabled when the toggle is switched ON with no selections (first-time setup)', async () => {
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

      toggleCustomPolicyOn();

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '0 of 2 selected'
        );
        expect(screen.getByTestId('manageRegionsSaveButton')).toBeDisabled();
      });
    });

    it('is enabled once a selection is made after switching the toggle ON (first-time setup)', async () => {
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

      toggleCustomPolicyOn();
      fireEvent.click(screen.getByTestId('manageRegionsSelectAllButton'));

      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '2 of 2 selected'
        );
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

      toggleCustomPolicyOn();

      // No policy + toggle ON → nothing selected yet → Save disabled.
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '0 of 2 selected'
        );
        expect(screen.getByTestId('manageRegionsSaveButton')).toBeDisabled();
      });

      // Select all → Save enabled.
      fireEvent.click(screen.getByTestId('manageRegionsSelectAllButton'));
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '2 of 2 selected'
        );
        expect(screen.getByTestId('manageRegionsSaveButton')).not.toBeDisabled();
      });

      // Deselect all again → Save disabled.
      fireEvent.click(screen.getByTestId('manageRegionsSelectAllButton'));
      await waitFor(() => {
        expect(screen.getByTestId('manageRegionsSelectionCount')).toHaveTextContent(
          '0 of 2 selected'
        );
        expect(screen.getByTestId('manageRegionsSaveButton')).toBeDisabled();
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

      expect(screen.getByTestId('manageRegionsErrorCallout')).toHaveTextContent(
        'Failed to load region data'
      );
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
    it('is hidden until the custom policy toggle is switched on', () => {
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

      expect(screen.queryByTestId('manageRegionsCallout')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('manageRegionsCustomPolicyToggle'));

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

      fireEvent.click(screen.getByTestId('manageRegionsCustomPolicyToggle'));

      fireEvent.click(screen.getByTestId('manageRegionsCalloutDismiss'));

      expect(screen.queryByTestId('manageRegionsCallout')).not.toBeInTheDocument();
    });
  });
});
