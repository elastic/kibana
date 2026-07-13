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
import { useSetSelection } from '../../hooks/use_set_selection';
import {
  getAvailableRegions,
  getAvailableGeos,
  getGeoDisplayName,
  regionKey,
} from '../../utils/eis_utils';
import { GEO_ORDER } from '../../types';
import type { PolicyMode } from '../../types';
import type { CspRegion } from '../../../common/types';
import type { ZoneGroup } from './region_zone_list';
import { computeSeedState } from '../../utils/compute_seed_state';

export const useManageRegionsState = (onClose: () => void) => {
  const { data: policy, isLoading: isPolicyLoading, isError: isPolicyError } = useRegionPolicy();
  const {
    data: eisEndpoints,
    isLoading: isEndpointsLoading,
    isError: isEndpointsError,
  } = useEisModels();
  const { mutate: savePolicy, isLoading: isSaving } = useSaveRegionPolicy();

  const availableRegions = useMemo(() => getAvailableRegions(eisEndpoints ?? []), [eisEndpoints]);
  const availableGeos = useMemo(() => getAvailableGeos(eisEndpoints ?? []), [eisEndpoints]);

  const regionSelection = useSetSelection(
    useMemo(() => availableRegions.map(regionKey), [availableRegions])
  );
  const geoSelection = useSetSelection(availableGeos);

  const { seed: seedRegions } = regionSelection;
  const { seed: seedGeos } = geoSelection;

  const [activeTab, setActiveTab] = useState<PolicyMode>('geo');
  const [syncedFromInitial, setSyncedFromInitial] = useState(false);

  const [isNewPolicy, setIsNewPolicy] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [isCallOutDismissed, setIsCallOutDismissed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Seed state once both queries finish loading.
  useEffect(() => {
    const shouldSeed = !isPolicyLoading && !isEndpointsLoading && !syncedFromInitial;
    if (shouldSeed) {
      const seedState = computeSeedState(policy, availableRegions, availableGeos);
      setActiveTab(seedState.activeTab);
      setIsNewPolicy(seedState.isNewPolicy);
      seedRegions(seedState.regionKeys);
      seedGeos(seedState.geos);
      setSyncedFromInitial(true);
    }
  }, [
    isPolicyLoading,
    isEndpointsLoading,
    syncedFromInitial,
    policy,
    availableRegions,
    availableGeos,
    seedRegions,
    seedGeos,
  ]);

  const zoneGroups = useMemo((): ZoneGroup[] => {
    const regionsByGeo: Record<string, CspRegion[]> = {};
    for (const region of availableRegions) {
      (regionsByGeo[region.geo ?? 'other'] ??= []).push(region);
    }

    const geoOrderList: readonly string[] = GEO_ORDER;
    const knownGeos = geoOrderList.filter((geo) => geo in regionsByGeo);
    const unknownGeos = Object.keys(regionsByGeo)
      .filter((geo) => !geoOrderList.includes(geo))
      .sort();

    return [...knownGeos, ...unknownGeos].map((geo) => ({
      geo,
      displayName: getGeoDisplayName(geo),
      regions: regionsByGeo[geo],
    }));
  }, [availableRegions]);

  // --- Derived values: Regions tab ---
  const isAllExpanded = zoneGroups.length > 0 && expandedZones.size === zoneGroups.length;

  // --- Common derived values ---
  const isLoading = isPolicyLoading || isEndpointsLoading;
  const isError = isPolicyError || isEndpointsError;
  const isDirty =
    syncedFromInitial && (activeTab === 'regions' ? regionSelection.isDirty : geoSelection.isDirty);

  const handleTabChange = useCallback((tab: PolicyMode) => {
    setActiveTab(tab);
  }, []);

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

  // --- Confirmation flow handlers ---
  const handleRequestSave = useCallback(() => {
    setShowConfirmation(true);
  }, []);

  const handleCancelConfirmation = useCallback(() => {
    if (isSaving) return;
    setShowConfirmation(false);
  }, [isSaving]);

  const handleConfirmSave = useCallback(() => {
    if (activeTab === 'geo') {
      savePolicy(
        { allowed_geos: [...geoSelection.selected] },
        {
          onSuccess: () => {
            setShowConfirmation(false);
            onClose();
          },
        }
      );
    } else {
      const allowedRegions = availableRegions
        .filter((r) => regionSelection.selected.has(regionKey(r)))
        .map(({ csp, region }) => ({ csp, region }));
      savePolicy(
        { allowed_regions: allowedRegions },
        {
          onSuccess: () => {
            setShowConfirmation(false);
            onClose();
          },
        }
      );
    }
  }, [
    activeTab,
    geoSelection.selected,
    regionSelection.selected,
    availableRegions,
    savePolicy,
    onClose,
  ]);

  const handleDismissCallOut = useCallback(() => {
    setIsCallOutDismissed(true);
  }, []);

  return {
    // Common
    activeTab,
    isLoading,
    isError,
    isSaving,
    isDirty,
    isNewPolicy,
    isCallOutDismissed,
    showConfirmation,
    // Regions tab
    zoneGroups,
    checkedKeys: regionSelection.selected,
    expandedZones,
    totalSelected: regionSelection.totalSelected,
    totalRegions: regionSelection.total,
    allSelected: regionSelection.allSelected,
    isAllExpanded,
    // Geo tab
    availableGeos,
    checkedGeos: geoSelection.selected,
    totalGeos: geoSelection.total,
    totalGeosSelected: geoSelection.totalSelected,
    allGeosSelected: geoSelection.allSelected,
    // Handlers – common
    handleTabChange,
    handleDismissCallOut,
    handleRequestSave,
    handleConfirmSave,
    handleCancelConfirmation,
    // Handlers – regions tab
    handleSelectAll: regionSelection.selectAll,
    handleToggleRegion: regionSelection.toggle,
    handleToggleExpand,
    handleExpandAll,
    // Handlers – geo tab
    handleToggleGeo: geoSelection.toggle,
    handleSelectAllGeos: geoSelection.selectAll,
  };
};
