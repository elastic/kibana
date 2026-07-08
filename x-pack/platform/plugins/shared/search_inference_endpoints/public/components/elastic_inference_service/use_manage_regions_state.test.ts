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
import { useEisModels } from '../../hooks/use_eis_models';
import * as eisUtils from '../../utils/eis_utils';

jest.mock('../../hooks/use_region_policy');
jest.mock('../../hooks/use_save_region_policy');
jest.mock('../../hooks/use_eis_models');
jest.mock('../../utils/eis_utils', () => ({
  ...jest.requireActual('../../utils/eis_utils'),
  getAvailableRegions: jest.fn(),
}));

const mockUseRegionPolicy = useRegionPolicy as jest.Mock;
const mockUseSaveRegionPolicy = useSaveRegionPolicy as jest.Mock;
const mockUseEisModels = useEisModels as jest.Mock;
const mockGetAvailableRegions = jest.mocked(eisUtils.getAvailableRegions);

const mockSaveMutate = jest.fn();

const usRegion = { csp: 'aws', region: 'us-east-1', geo: 'us' };
const euRegion = { csp: 'gcp', region: 'europe-west1', geo: 'eu' };
const twoRegions = [usRegion, euRegion];

describe('useManageRegionsState', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAvailableRegions.mockReturnValue(twoRegions);
    mockUseSaveRegionPolicy.mockReturnValue({ mutate: mockSaveMutate, isLoading: false });
    mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false, isError: false });
    mockUseEisModels.mockReturnValue({ data: [], isLoading: false, isError: false });
  });

  describe('initial checkbox seeding', () => {
    it('selects all regions when there is no existing policy', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false, isError: false });

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.checkedKeys).toEqual(new Set(['aws::us-east-1', 'gcp::europe-west1']));
      expect(result.current.totalSelected).toBe(2);
      expect(result.current.allSelected).toBe(true);
    });

    it('selects all regions when the policy has an empty allowed_regions list', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_regions: [] } },
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.checkedKeys).toEqual(new Set(['aws::us-east-1', 'gcp::europe-west1']));
    });

    it('seeds only the policy regions when a partial policy exists', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] } },
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.checkedKeys).toEqual(new Set(['aws::us-east-1']));
      expect(result.current.totalSelected).toBe(1);
      expect(result.current.allSelected).toBe(false);
    });

    it('does not seed while either query is still loading', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: true, isError: false });
      mockUseEisModels.mockReturnValue({ data: undefined, isLoading: true, isError: false });

      const { result } = renderHook(() => useManageRegionsState(onClose));

      // Effect guard blocks seeding — checkedKeys remains empty
      expect(result.current.checkedKeys.size).toBe(0);
    });

    it('does not seed twice if already synced', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: false, isError: false });

      const { result, rerender } = renderHook(() => useManageRegionsState(onClose));

      expect(result.current.checkedKeys.size).toBe(2);

      // Simulate a re-render with a different policy — syncedFromPolicy is true, no re-seed
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] } },
        isLoading: false,
        isError: false,
      });
      rerender();

      // Still 2 — the seeding effect is guarded by syncedFromPolicy
      expect(result.current.checkedKeys.size).toBe(2);
    });
  });

  describe('zone groups', () => {
    it('builds zone groups ordered by GEO_ORDER (us after eu, apac first)', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      // twoRegions has eu and us; apac absent → order should be eu, us
      const geos = result.current.zoneGroups.map((z) => z.geo);
      expect(geos).toEqual(['eu', 'us']);
    });

    it('assigns the correct display name to each zone', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      const euGroup = result.current.zoneGroups.find((z) => z.geo === 'eu');
      expect(euGroup?.displayName).toBe('Europe');
    });
  });

  describe('isAllExpanded', () => {
    it('is false when there are zones but none are expanded', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.isAllExpanded).toBe(false);
    });

    it('is false when zone list is empty (not a false positive)', () => {
      mockGetAvailableRegions.mockReturnValue([]);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.zoneGroups).toHaveLength(0);
      expect(result.current.isAllExpanded).toBe(false);
    });

    it('is true only when all zones are expanded', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.handleExpandAll());
      expect(result.current.isAllExpanded).toBe(true);
    });
  });

  describe('handleToggleRegion', () => {
    it('unchecks a checked region', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.handleToggleRegion('aws::us-east-1'));
      expect(result.current.checkedKeys.has('aws::us-east-1')).toBe(false);
    });

    it('checks an unchecked region', () => {
      mockUseRegionPolicy.mockReturnValue({
        data: { region_policy: { allowed_regions: [] } },
        isLoading: false,
        isError: false,
      });
      const { result } = renderHook(() => useManageRegionsState(onClose));
      // All selected after seeding (empty policy → all selected)
      act(() => result.current.handleToggleRegion('aws::us-east-1'));
      expect(result.current.checkedKeys.has('aws::us-east-1')).toBe(false);
      act(() => result.current.handleToggleRegion('aws::us-east-1'));
      expect(result.current.checkedKeys.has('aws::us-east-1')).toBe(true);
    });
  });

  describe('handleToggleZone', () => {
    it('unchecks all regions in a zone when all are checked', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      const usZone = result.current.zoneGroups.find((z) => z.geo === 'us')!;
      act(() => result.current.handleToggleZone(usZone));
      expect(result.current.checkedKeys.has('aws::us-east-1')).toBe(false);
      expect(result.current.checkedKeys.has('gcp::europe-west1')).toBe(true);
    });

    it('checks all regions in a zone when none are checked', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      // Deselect all first
      act(() => result.current.handleSelectAll());
      expect(result.current.totalSelected).toBe(0);
      const usZone = result.current.zoneGroups.find((z) => z.geo === 'us')!;
      act(() => result.current.handleToggleZone(usZone));
      expect(result.current.checkedKeys.has('aws::us-east-1')).toBe(true);
      expect(result.current.checkedKeys.has('gcp::europe-west1')).toBe(false);
    });
  });

  describe('handleSelectAll', () => {
    it('deselects all when all are selected', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.handleSelectAll());
      expect(result.current.totalSelected).toBe(0);
      expect(result.current.allSelected).toBe(false);
    });

    it('selects all when some are deselected', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.handleToggleRegion('aws::us-east-1'));
      expect(result.current.totalSelected).toBe(1);
      act(() => result.current.handleSelectAll());
      expect(result.current.totalSelected).toBe(2);
    });
  });

  describe('handleExpandAll / handleToggleExpand', () => {
    it('expands all zones on first call', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.handleExpandAll());
      expect(result.current.expandedZones.size).toBe(2);
    });

    it('collapses all zones when all are already expanded', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.handleExpandAll());
      act(() => result.current.handleExpandAll());
      expect(result.current.expandedZones.size).toBe(0);
    });

    it('is a no-op when zoneGroups is empty', () => {
      mockGetAvailableRegions.mockReturnValue([]);
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.zoneGroups).toHaveLength(0);
      act(() => result.current.handleExpandAll());
      expect(result.current.expandedZones.size).toBe(0);
    });

    it('toggles a single zone', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.handleToggleExpand('us', true));
      expect(result.current.expandedZones.has('us')).toBe(true);
      act(() => result.current.handleToggleExpand('us', false));
      expect(result.current.expandedZones.has('us')).toBe(false);
    });
  });

  describe('handleSave', () => {
    it('calls savePolicy with only csp+region (no geo field)', () => {
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.handleSave());
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
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.handleToggleRegion('aws::us-east-1'));
      act(() => result.current.handleSave());
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
      act(() => result.current.handleSave());
      expect(onClose).toHaveBeenCalled();
    });

    it('does not call onClose when save fails (modal stays open)', () => {
      mockSaveMutate.mockImplementation(() => {});
      const { result } = renderHook(() => useManageRegionsState(onClose));
      act(() => result.current.handleSave());
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('derived flags', () => {
    it('exposes isLoading=true while either query loads', () => {
      mockUseRegionPolicy.mockReturnValue({ data: null, isLoading: true, isError: false });
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.isLoading).toBe(true);
    });

    it('exposes isError=true when either query errors', () => {
      mockUseEisModels.mockReturnValue({ data: undefined, isLoading: false, isError: true });
      const { result } = renderHook(() => useManageRegionsState(onClose));
      expect(result.current.isError).toBe(true);
    });
  });
});
