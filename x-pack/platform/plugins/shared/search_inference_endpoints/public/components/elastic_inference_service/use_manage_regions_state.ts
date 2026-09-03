/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useRegionPolicy } from '../../hooks/use_region_policy';
import {
  useSaveRegionPolicy,
  type SaveRegionPolicyVariables,
} from '../../hooks/use_save_region_policy';
import { useDeleteRegionPolicy } from '../../hooks/use_delete_region_policy';
import { useEisModels } from '../../hooks/use_eis_models';
import { useRegionPreferencesRedesignEnabled } from '../../hooks/use_region_preferences_redesign_enabled';
import { getAvailableRegions, getAvailableGeos, regionKey } from '../../utils/eis_utils';
import { parseRegionPolicyConflict } from '../../utils/parse_region_policy_conflict';
import type { PolicyMode, RegionPolicyConflictArtifact } from '../../types';
import { computeSeedState } from '../../utils/compute_seed_state';
import { useSetSelection } from '../../hooks/use_set_selection';
import { useRegionTabState } from './use_region_tab_state';

export type ManageRegionsState = ReturnType<typeof useManageRegionsState>;

export const useManageRegionsState = (onClose: () => void) => {
  const { data: policy, isLoading: isPolicyLoading, isError: isPolicyError } = useRegionPolicy();
  const {
    data: eisEndpoints,
    isLoading: isEndpointsLoading,
    isError: isEndpointsError,
  } = useEisModels();
  const { mutate: savePolicy, isLoading: isSaving } = useSaveRegionPolicy();
  const { mutate: deletePolicy, isLoading: isDeleting } = useDeleteRegionPolicy(onClose);
  const isRedesignEnabled = useRegionPreferencesRedesignEnabled();

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
  const [conflictArtifacts, setConflictArtifacts] = useState<
    RegionPolicyConflictArtifact[] | undefined
  >(undefined);

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
      setConflictArtifacts(undefined);
      setShowConfirmation(true);
    }
  }, [pendingDelete]);

  const handleCancelConfirmation = useCallback(() => {
    if (isSaving) return;
    setConflictArtifacts(undefined);
    setShowConfirmation(false);
  }, [isSaving]);

  const handleCancelDeleteConfirmation = useCallback(() => {
    if (isDeleting) return;
    setShowDeleteConfirmation(false);
  }, [isDeleting]);

  const handleConfirmSave = useCallback(
    (force?: boolean) => {
      const forceFields = force === true ? { force: true } : {};
      const saveOptions = {
        onSuccess: () => {
          setConflictArtifacts(undefined);
          setShowConfirmation(false);
          onClose();
        },
        onError: (err: IHttpFetchError<ResponseErrorBody>) => {
          if (!isRedesignEnabled) return;
          const artifacts = parseRegionPolicyConflict(err.body?.attributes);
          if (artifacts) {
            setConflictArtifacts(artifacts);
          }
        },
      };

      if (activeTab === 'geo') {
        const variables: SaveRegionPolicyVariables = {
          body: { allowed_geos: [...geoSelection.selected] },
          ...forceFields,
        };
        savePolicy(variables, saveOptions);
        return;
      }

      const allowedRegions = availableRegions
        .filter((r) => regionTab.regionSelection.selected.has(regionKey(r)))
        .map(({ csp, region }) => ({ csp, region }));
      const variables: SaveRegionPolicyVariables = {
        body: { allowed_regions: allowedRegions },
        ...forceFields,
      };
      savePolicy(variables, saveOptions);
    },
    [
      activeTab,
      geoSelection.selected,
      regionTab.regionSelection.selected,
      availableRegions,
      savePolicy,
      onClose,
      isRedesignEnabled,
    ]
  );

  const handleConfirmDelete = useCallback(() => {
    deletePolicy();
  }, [deletePolicy]);

  const handleDismissCallOut = useCallback(() => {
    setIsCallOutDismissed(true);
  }, []);

  const { reset: resetGeoSelection } = geoSelection;
  const { reset: resetRegionSelection } = regionTab.regionSelection;
  const handleLocationTypeChange = useCallback(
    (next: PolicyMode) => {
      if (next === activeTab) return;
      setActiveTab(next);
      resetGeoSelection();
      resetRegionSelection();
    },
    [activeTab, setActiveTab, resetGeoSelection, resetRegionSelection]
  );

  const regionTabReturn = useMemo(
    () => ({
      zoneGroups: regionTab.zoneGroups,
      checkedKeys: regionTab.regionSelection.selected,
      totalRegions: regionTab.regionSelection.total,
      totalSelected: regionTab.regionSelection.totalSelected,
      allSelected: regionTab.regionSelection.allSelected,
      onSelectAll: regionTab.regionSelection.selectAll,
      onToggleRegion: regionTab.regionSelection.toggle,
    }),
    [
      regionTab.zoneGroups,
      regionTab.regionSelection.selected,
      regionTab.regionSelection.total,
      regionTab.regionSelection.totalSelected,
      regionTab.regionSelection.allSelected,
      regionTab.regionSelection.selectAll,
      regionTab.regionSelection.toggle,
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
      conflictArtifacts,
      isRedesignEnabled,
      setActiveTab,
      setUseCustomPolicy,
      handleDismissCallOut,
      handleLocationTypeChange,
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
