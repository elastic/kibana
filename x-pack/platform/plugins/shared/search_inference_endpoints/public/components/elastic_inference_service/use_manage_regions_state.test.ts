/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useManageRegionsState } from './use_manage_regions_state';
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

const mockUseRegionPolicy = jest.mocked(useRegionPolicy);
const mockUseSaveRegionPolicy = jest.mocked(useSaveRegionPolicy);
const mockUseDeleteRegionPolicy = jest.mocked(useDeleteRegionPolicy);
const mockUseEisModels = jest.mocked(useEisModels);
const mockGetAvailableRegions = jest.mocked(eisUtils.getAvailableRegions);
const mockGetAvailableGeos = jest.mocked(eisUtils.getAvailableGeos);

const mockSaveMutate = jest.fn();
const mockDeleteMutate = jest.fn();

const usRegion = { csp: 'aws', region: 'us-east-1', geo: 'us' };
const euRegion = { csp: 'gcp', region: 'europe-west1', geo: 'eu' };
const twoRegions = [usRegion, euRegion];

describe('useManageRegionsState', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAvailableRegions.mockReturnValue(twoRegions);
    mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
    mockUseSaveRegionPolicy.mockReturnValue({
      mutate: mockSaveMutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useSaveRegionPolicy>);
    mockUseDeleteRegionPolicy.mockReturnValue({
      mutate: mockDeleteMutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useDeleteRegionPolicy>);
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

  // ---------------------------------------------------------------------------
  // Initial checkbox seeding
  // ---------------------------------------------------------------------------
  describe('initial checkbox seeding', () => {
    it('leaves regions unselected when there is no existing policy', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.regionTab.checkedKeys.size).toBe(0);
      expect(result.current.regionTab.totalSelected).toBe(0);
      expect(result.current.regionTab.allSelected).toBe(false);
    });

    it('leaves regions unselected when the policy has an empty allowed_regions list', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_regions: [] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.regionTab.checkedKeys.size).toBe(0);
    });

    it('seeds only the policy regions when a partial policy exists', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] } },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.regionTab.checkedKeys).toEqual(new Set(['aws::us-east-1']));
      expect(result.current.regionTab.totalSelected).toBe(1);
      expect(result.current.regionTab.allSelected).toBe(false);
    });

    it('seeds all regions when the policy has all regions', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: {
          region_policy: {
            allowed_regions: [
              { csp: 'aws', region: 'us-east-1' },
              { csp: 'gcp', region: 'europe-west1' },
            ],
          },
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.regionTab.checkedKeys).toEqual(
        new Set(['aws::us-east-1', 'gcp::europe-west1'])
      );
      expect(result.current.regionTab.allSelected).toBe(true);
    });

    it('does not seed while either query is still loading', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      mockUseEisModels.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as unknown as ReturnType<typeof useEisModels>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      // Effect guard blocks seeding — checkedKeys remains empty
      expect(result.current.regionTab.checkedKeys.size).toBe(0);
    });

    it('does not seed twice if already synced', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result, rerender } = renderHook(() => useManageRegionsState(onClose));

      // No policy → nothing seeded
      expect(result.current.regionTab.checkedKeys.size).toBe(0);

      // Simulate a re-render with a different policy — syncedFromInitial is true, no re-seed
      mockUseRegionPolicy.mockReturnValue({
        data: {
          region_policy: { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] },
          created_at: '2024-01-01T00:00:00Z',
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      rerender();

      // Still 0 — the seeding effect is guarded by syncedFromInitial
      expect(result.current.regionTab.checkedKeys.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Geo policy seeding
  // ---------------------------------------------------------------------------
  describe('geo policy seeding', () => {
    it('activates geo tab and seeds checkedGeos when policy has allowed_geos', () => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us', 'apac']);
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.common.activeTab).toBe('geo');
      expect(result.current.geoTab.checkedGeos).toEqual(new Set(['eu']));
    });

    it('filters out geos from policy that are not in availableGeos', () => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        data: {
          region_policy: { allowed_geos: ['eu', 'unknown-geo'] },
          created_at: '2024-01-01T00:00:00Z',
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.geoTab.checkedGeos).toEqual(new Set(['eu']));
    });

    it('activates Geo tab with no pre-selected geos when no policy exists', () => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.common.activeTab).toBe('geo');
      expect(result.current.geoTab.checkedGeos.size).toBe(0);
    });

    it('seeds geo tab with empty set when an explicit regions policy is active', () => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] } },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.common.activeTab).toBe('regions');
      expect(result.current.geoTab.checkedGeos).toEqual(new Set());
    });

    it('seeds regions tab with empty set when geo policy is active (mutually exclusive)', () => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      // Geo tab should be active with 'eu' checked.
      expect(result.current.common.activeTab).toBe('geo');
      expect(result.current.geoTab.checkedGeos).toEqual(new Set(['eu']));
      // Regions tab must have nothing pre-selected — the geo policy owns the policy slot.
      expect(result.current.regionTab.checkedKeys).toEqual(new Set());
    });
  });

  // ---------------------------------------------------------------------------
  // Custom-policy toggle seeding
  // ---------------------------------------------------------------------------
  describe('custom-policy toggle seeding', () => {
    it('seeds useCustomPolicy=false when no policy exists', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.common.useCustomPolicy).toBe(false);
      expect(result.current.common.hasExistingPolicy).toBe(false);
      expect(result.current.common.pendingDelete).toBe(false);
    });

    it('seeds useCustomPolicy=true when an allowed_geos policy exists', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.common.useCustomPolicy).toBe(true);
      expect(result.current.common.hasExistingPolicy).toBe(true);
      expect(result.current.common.pendingDelete).toBe(false);
    });

    it('seeds useCustomPolicy=true when an allowed_regions policy exists', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: {
          region_policy: { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] },
          created_at: '2024-01-01T00:00:00Z',
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.common.useCustomPolicy).toBe(true);
      expect(result.current.common.hasExistingPolicy).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Toggle-driven dirty and pending-delete behaviour
  // ---------------------------------------------------------------------------
  describe('toggle-driven dirty tracking', () => {
    it('turning toggle OFF with an existing policy makes the modal dirty and pending delete', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.common.isDirty).toBe(false);

      act(() => result.current.common.setUseCustomPolicy(false));

      expect(result.current.common.useCustomPolicy).toBe(false);
      expect(result.current.common.pendingDelete).toBe(true);
      expect(result.current.common.isDirty).toBe(true);
      expect(result.current.common.isSaveDisabled).toBe(false);
    });

    it('turning toggle OFF with no existing policy keeps the modal clean and Save disabled', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));
      // Toggle already OFF by default.
      expect(result.current.common.useCustomPolicy).toBe(false);
      expect(result.current.common.pendingDelete).toBe(false);
      expect(result.current.common.isDirty).toBe(false);
      expect(result.current.common.isSaveDisabled).toBe(true);
    });

    it('turning the toggle back ON before Save clears the pending delete', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));

      act(() => result.current.common.setUseCustomPolicy(false));
      expect(result.current.common.pendingDelete).toBe(true);

      act(() => result.current.common.setUseCustomPolicy(true));
      expect(result.current.common.pendingDelete).toBe(false);
      // No selection changes → not dirty against the seeded policy.
      expect(result.current.common.isDirty).toBe(false);
      expect(result.current.geoTab.checkedGeos).toEqual(new Set(['eu']));
    });

    it('disables Save when an existing policy is kept ON but every selection is cleared', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);

      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.common.useCustomPolicy).toBe(true);

      act(() => result.current.geoTab.onToggleGeo('eu'));

      expect(result.current.geoTab.totalGeosSelected).toBe(0);
      expect(result.current.common.pendingDelete).toBe(false);
      expect(result.current.common.isSaveDisabled).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // onToggleGeo / onSelectAll (geos)
  // ---------------------------------------------------------------------------
  describe('onToggleGeo', () => {
    it('unchecks a checked geo', () => {
      // Seed a geo policy that has both geos selected.
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu', 'us'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.geoTab.checkedGeos.has('eu')).toBe(true);
      act(() => result.current.geoTab.onToggleGeo('eu'));
      expect(result.current.geoTab.checkedGeos.has('eu')).toBe(false);
      expect(result.current.geoTab.checkedGeos.has('us')).toBe(true);
    });

    it('checks an unchecked geo', () => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['us'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.geoTab.checkedGeos.has('eu')).toBe(false);
      act(() => result.current.geoTab.onToggleGeo('eu'));
      expect(result.current.geoTab.checkedGeos.has('eu')).toBe(true);
    });
  });

  describe('onSelectAll (geos)', () => {
    it('selects all geos when only a subset is selected', () => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        // Geo policy with only 'eu' → checkedGeos = Set(['eu']), allSelected = false
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.geoTab.checkedGeos).toEqual(new Set(['eu']));
      act(() => result.current.geoTab.onSelectAll());
      expect(result.current.geoTab.checkedGeos).toEqual(new Set(['eu', 'us']));
    });

    it('deselects all geos when all are selected', () => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu', 'us'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.geoTab.allGeosSelected).toBe(true);
      act(() => result.current.geoTab.onSelectAll());
      expect(result.current.geoTab.totalGeosSelected).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // setActiveTab + isDirty cross-tab behaviour
  // ---------------------------------------------------------------------------
  describe('setActiveTab and isDirty', () => {
    it('switches activeTab', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      // Default is 'geo' when no policy exists.
      expect(result.current.common.activeTab).toBe('geo');
      act(() => result.current.common.setActiveTab('regions'));
      expect(result.current.common.activeTab).toBe('regions');
    });

    it('isDirty reflects the active tab selection, not the other tab', () => {
      // Use an existing geo policy so isNewPolicy=false and isDirty is tab-specific.
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      // Geo tab active with 'eu'. Toggle 'us' → dirty on geo tab.
      act(() => result.current.geoTab.onToggleGeo('us'));
      expect(result.current.common.isDirty).toBe(true);

      // Switch to regions tab — starts empty (geo policy, no regions policy) → not dirty.
      act(() => result.current.common.setActiveTab('regions'));
      expect(result.current.common.isDirty).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // handleConfirmSave (regions mode)
  // ---------------------------------------------------------------------------
  describe('handleConfirmSave (regions mode)', () => {
    it('calls savePolicy with all csp+region pairs when a full policy is seeded', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: {
          region_policy: {
            allowed_regions: [
              { csp: 'aws', region: 'us-east-1' },
              { csp: 'gcp', region: 'europe-west1' },
            ],
          },
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.common.handleConfirmSave());
      expect(mockSaveMutate).toHaveBeenCalledWith(
        {
          allowed_regions: [
            { csp: 'aws', region: 'us-east-1' },
            { csp: 'gcp', region: 'europe-west1' },
          ],
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('calls savePolicy with only selected regions when a subset is checked', () => {
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
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.regionTab.onToggleRegion('aws::us-east-1'));
      act(() => result.current.common.handleConfirmSave());
      expect(mockSaveMutate).toHaveBeenCalledWith(
        { allowed_regions: [{ csp: 'gcp', region: 'europe-west1' }] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('calls onClose via the onSuccess callback', () => {
      mockSaveMutate.mockImplementation(
        (_body: unknown, { onSuccess }: { onSuccess: () => void }) => onSuccess()
      );
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.common.handleConfirmSave());
      expect(onClose).toHaveBeenCalled();
    });

    it('does not call onClose when save fails (modal stays open)', () => {
      mockSaveMutate.mockImplementation(() => {});
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.common.handleConfirmSave());
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // handleConfirmSave (geo mode)
  // ---------------------------------------------------------------------------
  describe('handleConfirmSave (geo mode)', () => {
    beforeEach(() => {
      mockGetAvailableGeos.mockReturnValue(['eu', 'us']);
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu', 'us'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
    });

    it('calls savePolicy with allowed_geos payload', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.common.activeTab).toBe('geo');
      act(() => result.current.common.handleConfirmSave());
      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({ allowed_geos: expect.arrayContaining(['eu', 'us']) }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
      expect(mockSaveMutate).not.toHaveBeenCalledWith(
        expect.objectContaining({ allowed_regions: expect.anything() }),
        expect.anything()
      );
    });

    it('calls savePolicy with only selected geos when a subset is chosen', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.geoTab.onToggleGeo('eu'));
      act(() => result.current.common.handleConfirmSave());
      expect(mockSaveMutate).toHaveBeenCalledWith(
        { allowed_geos: ['us'] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Confirmation flow: handleRequestSave / handleCancelConfirmation
  // ---------------------------------------------------------------------------
  describe('confirmation flow', () => {
    it('showConfirmation is false initially', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.common.showConfirmation).toBe(false);
      expect(result.current.common.showDeleteConfirmation).toBe(false);
    });

    it('handleRequestSave opens the PUT confirmation when a custom policy is active', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.common.handleRequestSave());
      expect(result.current.common.showConfirmation).toBe(true);
      expect(result.current.common.showDeleteConfirmation).toBe(false);
    });

    it('handleRequestSave opens the delete confirmation when the toggle is OFF with an existing policy', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      const { result } = renderHook(() => useManageRegionsState(onClose));

      act(() => result.current.common.setUseCustomPolicy(false));
      act(() => result.current.common.handleRequestSave());

      expect(result.current.common.showDeleteConfirmation).toBe(true);
      expect(result.current.common.showConfirmation).toBe(false);
    });

    it('handleCancelConfirmation sets showConfirmation back to false', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.common.handleRequestSave());
      act(() => result.current.common.handleCancelConfirmation());
      expect(result.current.common.showConfirmation).toBe(false);
    });

    it('handleCancelDeleteConfirmation sets showDeleteConfirmation back to false', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.common.setUseCustomPolicy(false));
      act(() => result.current.common.handleRequestSave());
      expect(result.current.common.showDeleteConfirmation).toBe(true);
      act(() => result.current.common.handleCancelDeleteConfirmation());
      expect(result.current.common.showDeleteConfirmation).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // handleConfirmDelete
  // ---------------------------------------------------------------------------
  describe('handleConfirmDelete', () => {
    beforeEach(() => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_geos: ['eu'] }, created_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
    });

    it('calls deletePolicy with no arguments', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.common.handleConfirmDelete());
      expect(mockDeleteMutate).toHaveBeenCalledWith();
    });

    it('wires onClose into useDeleteRegionPolicy so it runs when delete succeeds', () => {
      renderHook(() => useManageRegionsState(onClose));
      expect(mockUseDeleteRegionPolicy).toHaveBeenCalledWith(onClose);
    });

    it('keeps the delete confirmation and parent modal open when delete fails', () => {
      mockDeleteMutate.mockImplementation(() => {});
      const { result } = renderHook(() => useManageRegionsState(onClose));

      act(() => result.current.common.setUseCustomPolicy(false));
      act(() => result.current.common.handleRequestSave());
      expect(result.current.common.showDeleteConfirmation).toBe(true);

      act(() => result.current.common.handleConfirmDelete());

      expect(onClose).not.toHaveBeenCalled();
      expect(result.current.common.showDeleteConfirmation).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Derived flags
  // ---------------------------------------------------------------------------
  describe('derived flags', () => {
    it('exposes isLoading=true while either query loads', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
      } as unknown as ReturnType<typeof useRegionPolicy>);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.common.isLoading).toBe(true);
    });

    it('exposes isError=true when either query errors', () => {
      mockUseEisModels.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as unknown as ReturnType<typeof useEisModels>);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.common.isError).toBe(true);
    });
  });
});
