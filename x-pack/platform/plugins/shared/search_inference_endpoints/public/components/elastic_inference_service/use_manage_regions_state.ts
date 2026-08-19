/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRegionPolicy } from '../../hooks/use_region_policy';
import { useSaveRegionPolicy } from '../../hooks/use_save_region_policy';
import { useDeleteRegionPolicy } from '../../hooks/use_delete_region_policy';
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
  const { mutate: deletePolicy, isLoading: isDeleting } = useDeleteRegionPolicy(onClose);

  const availableRegions = useMemo(() => getAvailableRegions(eisEndpoints ?? []), [eisEndpoints]);
  const availableGeos = useMemo(() => getAvailableGeos(eisEndpoints ?? []), [eisEndpoints]);

  const regionTab = useRegionTabState(availableRegions);
  const geoSelection = useSetSelection(availableGeos);

  const { seed: seedRegions } = regionTab.regionSelection;
  const { seed: seedGeos } = geoSelection;

  const [activeTab, setActiveTab] = useState<PolicyMode>('geo');
  const [syncedFromInitial, setSyncedFromInitial] = useState(false);
  const [isNewPolicy, setIsNewPolicy] = useState(false);
  const [useCustomPolicy, setUseCustomPolicy] = useState(false);
  const [isCallOutDismissed, setIsCallOutDismissed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Seed state once both queries finish loading.
  useEffect(() => {
    const shouldSeed = !isPolicyLoading && !isEndpointsLoading && !syncedFromInitial;
    if (shouldSeed) {
      const seedState = computeSeedState(policy, availableRegions, availableGeos);
      setActiveTab(seedState.activeTab);
      setIsNewPolicy(seedState.isNewPolicy);
      // Toggle is ON when a custom policy is already saved; OFF for first-time setup.
      setUseCustomPolicy(!seedState.isNewPolicy);
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
  const hasExistingPolicy = syncedFromInitial && !isNewPolicy;
  const pendingDelete = hasExistingPolicy && !useCustomPolicy;

  const hasUnsavedSelectionChanges = isNewPolicy || activeSelectionIsDirty;
  const hasCustomPolicyEdits = syncedFromInitial && hasUnsavedSelectionChanges;
  const isDirty = useCustomPolicy ? hasCustomPolicyEdits : pendingDelete;

  const hasNoGeosSelected = geoSelection.totalSelected === 0;
  const hasNoRegionsSelected = regionTab.regionSelection.totalSelected === 0;
  const hasEmptySelection = activeTab === 'geo' ? hasNoGeosSelected : hasNoRegionsSelected;

  const isBusy = isSaving || isDeleting || isLoading;
  const requiresSelection = useCustomPolicy && hasEmptySelection;
  const isSaveDisabled = isBusy || !isDirty || requiresSelection;

  // --- Confirmation flow handlers ---
  const handleRequestSave = useCallback(() => {
    if (pendingDelete) {
      setShowDeleteConfirmation(true);
    } else {
      setShowConfirmation(true);
    }
  }, [pendingDelete]);

  const handleCancelConfirmation = useCallback(() => {
    if (isSaving) return;
    setShowConfirmation(false);
  }, [isSaving]);

  const handleCancelDeleteConfirmation = useCallback(() => {
    if (isDeleting) return;
    setShowDeleteConfirmation(false);
  }, [isDeleting]);

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

  const handleConfirmDelete = useCallback(() => {
    deletePolicy();
  }, [deletePolicy]);

  const handleDismissCallOut = useCallback(() => {
    setIsCallOutDismissed(true);
  }, []);

  const regionTabReturn = useMemo(
    () => ({
      zoneGroups: regionTab.zoneGroups,
      checkedKeys: regionTab.regionSelection.selected,
      expandedZones: regionTab.expandedZones,
      totalRegions: regionTab.regionSelection.total,
      totalSelected: regionTab.regionSelection.totalSelected,
      allSelected: regionTab.regionSelection.allSelected,
      isAllExpanded: regionTab.isAllExpanded,
      onSelectAll: regionTab.regionSelection.selectAll,
      onToggleRegion: regionTab.regionSelection.toggle,
      onToggleExpand: regionTab.handleToggleExpand,
      onExpandAll: regionTab.handleExpandAll,
    }),
    [
      regionTab.zoneGroups,
      regionTab.regionSelection.selected,
      regionTab.expandedZones,
      regionTab.regionSelection.total,
      regionTab.regionSelection.totalSelected,
      regionTab.regionSelection.allSelected,
      regionTab.isAllExpanded,
      regionTab.regionSelection.selectAll,
      regionTab.regionSelection.toggle,
      regionTab.handleToggleExpand,
      regionTab.handleExpandAll,
    ]
  );

  const geoTabReturn = useMemo(
    () => ({
      availableGeos,
      checkedGeos: geoSelection.selected,
      totalGeos: geoSelection.total,
      totalGeosSelected: geoSelection.totalSelected,
      allGeosSelected: geoSelection.allSelected,
      onSelectAll: geoSelection.selectAll,
      onToggleGeo: geoSelection.toggle,
    }),
    [
      availableGeos,
      geoSelection.selected,
      geoSelection.total,
      geoSelection.totalSelected,
      geoSelection.allSelected,
      geoSelection.selectAll,
      geoSelection.toggle,
    ]
  );

  return {
    // Shared modal state and handlers
    common: {
      activeTab,
      isLoading,
      isError,
      isSaving,
      isDeleting,
      isDirty,
      hasExistingPolicy,
      pendingDelete,
      useCustomPolicy,
      isSaveDisabled,
      isCallOutDismissed,
      showConfirmation,
      showDeleteConfirmation,
      setActiveTab,
      setUseCustomPolicy,
      handleDismissCallOut,
      handleRequestSave,
      handleConfirmSave,
      handleCancelConfirmation,
      handleConfirmDelete,
      handleCancelDeleteConfirmation,
    },
    regionTab: regionTabReturn,
    geoTab: geoTabReturn,
  };
};
