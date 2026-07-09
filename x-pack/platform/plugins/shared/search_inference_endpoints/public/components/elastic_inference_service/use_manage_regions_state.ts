/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRegionPolicy } from '../../hooks/use_region_policy';
import { useSaveRegionPolicy } from '../../hooks/use_save_region_policy';
import { useEisModels } from '../../hooks/use_eis_models';
import { getAvailableRegions, getGeoDisplayName, regionKey } from '../../utils/eis_utils';
import { GEO_ORDER } from '../../types';
import type { CspRegion } from '../../../common/types';
import type { ZoneGroup } from './region_zone_list';

export const useManageRegionsState = (onClose: () => void) => {
  const { data: policy, isLoading: isPolicyLoading, isError: isPolicyError } = useRegionPolicy();
  const {
    data: eisEndpoints,
    isLoading: isEndpointsLoading,
    isError: isEndpointsError,
  } = useEisModels();
  const { mutate: savePolicy, isLoading: isSaving } = useSaveRegionPolicy();

  const availableRegions = useMemo(() => getAvailableRegions(eisEndpoints ?? []), [eisEndpoints]);

  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [initialCheckedKeys, setInitialCheckedKeys] = useState<Set<string>>(new Set());
  const [syncedFromPolicy, setSyncedFromPolicy] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [isCallOutDismissed, setIsCallOutDismissed] = useState(false);

  // Seed checkbox state once the policy finishes loading.
  useEffect(() => {
    if (!isPolicyLoading && !isEndpointsLoading && !syncedFromPolicy) {
      const existing = policy?.region_policy?.allowed_regions ?? [];
      if (existing.length > 0) {
        const availableKeys = new Set(availableRegions.map(regionKey));
        const seeded = new Set(existing.map(regionKey).filter((k) => availableKeys.has(k)));
        setCheckedKeys(seeded);
        setInitialCheckedKeys(seeded);
      } else {
        const seeded = new Set(availableRegions.map(regionKey));
        setCheckedKeys(seeded);
        setInitialCheckedKeys(seeded);
      }
      setSyncedFromPolicy(true);
    }
  }, [isPolicyLoading, isEndpointsLoading, syncedFromPolicy, policy, availableRegions]);

  const zoneGroups = useMemo((): ZoneGroup[] => {
    const regionsByGeo: Record<string, CspRegion[]> = {};
    for (const region of availableRegions) {
      (regionsByGeo[region.geo ?? 'other'] ??= []).push(region);
    }

    return GEO_ORDER.filter((geo) => geo in regionsByGeo).map((geo) => ({
      geo,
      displayName: getGeoDisplayName(geo),
      regions: regionsByGeo[geo],
    }));
  }, [availableRegions]);

  const totalSelected = checkedKeys.size;
  const totalRegions = availableRegions.length;
  const allSelected = totalRegions > 0 && totalSelected === totalRegions;
  const isAllExpanded = zoneGroups.length > 0 && expandedZones.size === zoneGroups.length;
  const isLoading = isPolicyLoading || isEndpointsLoading;
  const isError = isPolicyError || isEndpointsError;
  const isDirty =
    syncedFromPolicy &&
    (checkedKeys.size !== initialCheckedKeys.size ||
      [...checkedKeys].some((k) => !initialCheckedKeys.has(k)));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setCheckedKeys(new Set());
    } else {
      setCheckedKeys(new Set(availableRegions.map(regionKey)));
    }
  }, [allSelected, availableRegions]);

  const handleToggleRegion = useCallback((key: string) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleToggleZone = useCallback(
    (zone: ZoneGroup) => {
      const zoneKeys = zone.regions.map(regionKey);
      const allZoneChecked = zoneKeys.every((k) => checkedKeys.has(k));
      setCheckedKeys((prev) => {
        const next = new Set(prev);
        if (allZoneChecked) {
          zoneKeys.forEach((k) => next.delete(k));
        } else {
          zoneKeys.forEach((k) => next.add(k));
        }
        return next;
      });
    },
    [checkedKeys]
  );

  const handleToggleExpand = useCallback((zoneId: string, isOpen: boolean) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(zoneId);
      } else {
        next.delete(zoneId);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (zoneGroups.length === 0) return;
    if (expandedZones.size === zoneGroups.length) {
      setExpandedZones(new Set());
    } else {
      setExpandedZones(new Set(zoneGroups.map((z) => z.geo)));
    }
  }, [expandedZones.size, zoneGroups]);

  const handleSave = useCallback(() => {
    const allowedRegions = availableRegions
      .filter((r) => checkedKeys.has(regionKey(r)))
      .map(({ csp, region }) => ({ csp, region }));
    savePolicy({ allowed_regions: allowedRegions }, { onSuccess: onClose });
  }, [availableRegions, checkedKeys, savePolicy, onClose]);

  const handleDismissCallOut = useCallback(() => {
    setIsCallOutDismissed(true);
  }, []);

  return {
    zoneGroups,
    checkedKeys,
    expandedZones,
    isCallOutDismissed,
    totalSelected,
    totalRegions,
    allSelected,
    isAllExpanded,
    isLoading,
    isError,
    isSaving,
    isDirty,
    handleDismissCallOut,
    handleSelectAll,
    handleToggleRegion,
    handleToggleZone,
    handleToggleExpand,
    handleExpandAll,
    handleSave,
  };
};
