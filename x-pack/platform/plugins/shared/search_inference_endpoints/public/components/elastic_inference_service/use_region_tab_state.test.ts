/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useRegionTabState } from './use_region_tab_state';

const usRegion = { csp: 'aws', region: 'us-east-1', geo: 'us' };
const euRegion = { csp: 'gcp', region: 'europe-west1', geo: 'eu' };
const twoRegions = [usRegion, euRegion];

describe('useRegionTabState', () => {
  // ---------------------------------------------------------------------------
  // zoneGroups
  // ---------------------------------------------------------------------------
  describe('zoneGroups', () => {
    it('builds zone groups ordered by GEO_ORDER (apac, eu, us, other)', () => {
      // twoRegions has eu and us; GEO_ORDER = ['apac', 'eu', 'us', 'other']
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      const geos = result.current.zoneGroups.map((z) => z.geo);
      expect(geos).toEqual(['eu', 'us']);
    });

    it('assigns the correct display name to each zone', () => {
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      const euGroup = result.current.zoneGroups.find((z) => z.geo === 'eu');
      expect(euGroup?.displayName).toBe('Europe');
    });

    it('appends unknown geos alphabetically after known ones', () => {
      const regions = [
        { csp: 'aws', region: 'us-east-1', geo: 'us' },
        { csp: 'aws', region: 'me-central-1', geo: 'mea' },
      ];
      const { result } = renderHook(() => useRegionTabState(regions));
      const geos = result.current.zoneGroups.map((z) => z.geo);
      // 'us' is known (GEO_ORDER); 'mea' is unknown, appended alphabetically
      expect(geos).toEqual(['us', 'mea']);
    });

    it('returns an empty array when no regions are provided', () => {
      const { result } = renderHook(() => useRegionTabState([]));
      expect(result.current.zoneGroups).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // isAllExpanded
  // ---------------------------------------------------------------------------
  describe('isAllExpanded', () => {
    it('is false when there are zones but none are expanded', () => {
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      expect(result.current.isAllExpanded).toBe(false);
    });

    it('is false when zone list is empty (not a false positive)', () => {
      const { result } = renderHook(() => useRegionTabState([]));
      expect(result.current.zoneGroups).toHaveLength(0);
      expect(result.current.isAllExpanded).toBe(false);
    });

    it('is true only when all zones are expanded', () => {
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      act(() => result.current.handleExpandAll());
      expect(result.current.isAllExpanded).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // handleExpandAll / handleToggleExpand
  // ---------------------------------------------------------------------------
  describe('handleExpandAll / handleToggleExpand', () => {
    it('expands all zones on first call', () => {
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      act(() => result.current.handleExpandAll());
      expect(result.current.expandedZones.size).toBe(2);
    });

    it('collapses all zones when all are already expanded', () => {
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      act(() => result.current.handleExpandAll());
      act(() => result.current.handleExpandAll());
      expect(result.current.expandedZones.size).toBe(0);
    });

    it('is a no-op when zoneGroups is empty', () => {
      const { result } = renderHook(() => useRegionTabState([]));
      act(() => result.current.handleExpandAll());
      expect(result.current.expandedZones.size).toBe(0);
    });

    it('toggles a single zone open and closed', () => {
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      act(() => result.current.handleToggleExpand('us', true));
      expect(result.current.expandedZones.has('us')).toBe(true);
      act(() => result.current.handleToggleExpand('us', false));
      expect(result.current.expandedZones.has('us')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // regionSelection.toggle
  // ---------------------------------------------------------------------------
  describe('regionSelection.toggle', () => {
    it('unchecks a checked region', () => {
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      act(() =>
        result.current.regionSelection.seed(new Set(['aws::us-east-1', 'gcp::europe-west1']))
      );
      expect(result.current.regionSelection.selected.has('aws::us-east-1')).toBe(true);
      act(() => result.current.regionSelection.toggle('aws::us-east-1'));
      expect(result.current.regionSelection.selected.has('aws::us-east-1')).toBe(false);
    });

    it('checks an unchecked region', () => {
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      act(() => result.current.regionSelection.seed(new Set(['gcp::europe-west1'])));
      expect(result.current.regionSelection.selected.has('aws::us-east-1')).toBe(false);
      act(() => result.current.regionSelection.toggle('aws::us-east-1'));
      expect(result.current.regionSelection.selected.has('aws::us-east-1')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // regionSelection.selectAll
  // ---------------------------------------------------------------------------
  describe('regionSelection.selectAll', () => {
    it('deselects all when all are selected', () => {
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      act(() =>
        result.current.regionSelection.seed(new Set(['aws::us-east-1', 'gcp::europe-west1']))
      );
      expect(result.current.regionSelection.allSelected).toBe(true);
      act(() => result.current.regionSelection.selectAll());
      expect(result.current.regionSelection.totalSelected).toBe(0);
      expect(result.current.regionSelection.allSelected).toBe(false);
    });

    it('selects all when none are selected', () => {
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      act(() => result.current.regionSelection.seed(new Set()));
      act(() => result.current.regionSelection.selectAll());
      expect(result.current.regionSelection.totalSelected).toBe(2);
      expect(result.current.regionSelection.allSelected).toBe(true);
    });

    it('selects all when some are deselected', () => {
      const { result } = renderHook(() => useRegionTabState(twoRegions));
      act(() => result.current.regionSelection.seed(new Set(['gcp::europe-west1'])));
      expect(result.current.regionSelection.totalSelected).toBe(1);
      act(() => result.current.regionSelection.selectAll());
      expect(result.current.regionSelection.totalSelected).toBe(2);
    });
  });
});
