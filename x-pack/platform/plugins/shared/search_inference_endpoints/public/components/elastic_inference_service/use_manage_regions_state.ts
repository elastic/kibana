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
import { getAvailableRegions, getAvailableGeos, regionKey } from '../../utils/eis_utils';
import type { PolicyMode } from '../../types';
import { computeSeedState } from '../../utils/compute_seed_state';
import { useSetSelection } from '../../hooks/use_set_selection';
import { useRegionTabState } from './use_region_tab_state';

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

  const regionTab = useRegionTabState(availableRegions);
  const geoSelection = useSetSelection(availableGeos);

  const { seed: seedRegions } = regionTab.regionSelection;
  const { seed: seedGeos } = geoSelection;

  const [activeTab, setActiveTab] = useState<PolicyMode>('geo');
  const [syncedFromInitial, setSyncedFromInitial] = useState(false);
  const [isNewPolicy, setIsNewPolicy] = useState(false);
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

  // --- Common derived values ---
  const isLoading = isPolicyLoading || isEndpointsLoading;
  const isError = isPolicyError || isEndpointsError;
  const activeSelectionIsDirty =
    activeTab === 'regions' ? regionTab.regionSelection.isDirty : geoSelection.isDirty;
  const isDirty = syncedFromInitial && (isNewPolicy || activeSelectionIsDirty);
  const noSelections =
    activeTab === 'geo'
      ? geoSelection.totalSelected === 0
      : regionTab.regionSelection.totalSelected === 0;
  const isSaveDisabled = isSaving || isLoading || !isDirty || (isNewPolicy && noSelections);

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
        .filter((r) => regionTab.regionSelection.selected.has(regionKey(r)))
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
    regionTab.regionSelection.selected,
    availableRegions,
    savePolicy,
    onClose,
  ]);

  const handleDismissCallOut = useCallback(() => {
    setIsCallOutDismissed(true);
  }, []);

  return {
    // Common modal state
    activeTab,
    isLoading,
    isError,
    isSaving,
    isDirty,
    isNewPolicy,
    isSaveDisabled,
    isCallOutDismissed,
    showConfirmation,
    // Common handlers
    setActiveTab,
    handleDismissCallOut,
    handleRequestSave,
    handleConfirmSave,
    handleCancelConfirmation,
    // Regions tab
    regionTab: {
      zoneGroups: regionTab.zoneGroups,
      checkedKeys: regionTab.regionSelection.selected,
      expandedZones: regionTab.expandedZones,
      total: regionTab.regionSelection.total,
      totalSelected: regionTab.regionSelection.totalSelected,
      allSelected: regionTab.regionSelection.allSelected,
      isAllExpanded: regionTab.isAllExpanded,
      onSelectAll: regionTab.regionSelection.selectAll,
      onToggleRegion: regionTab.regionSelection.toggle,
      onToggleExpand: regionTab.handleToggleExpand,
      onExpandAll: regionTab.handleExpandAll,
    },
    // Geo tab
    geoTab: {
      availableGeos,
      checkedGeos: geoSelection.selected,
      total: geoSelection.total,
      totalSelected: geoSelection.totalSelected,
      allSelected: geoSelection.allSelected,
      onSelectAll: geoSelection.selectAll,
      onToggleGeo: geoSelection.toggle,
    },
  };
};
