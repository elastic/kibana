/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import type { EndpointEfforts } from '../../types';

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

interface UseRecommendedDefaultsParams {
  featureId: string;
  endpointIds: string[];
  effectiveRecommendedEndpoints: string[];
  efforts: EndpointEfforts;
  effectiveRecommendedEfforts: EndpointEfforts;
  regionDeniedEndpointIds: ReadonlySet<string>;
  onEndpointsChange: (featureId: string, newEndpointIds: string[]) => void;
  onEffortsChange: (featureId: string, newEfforts: EndpointEfforts) => void;
  discardVersion: number;
}

interface RecommendedDefaults {
  hasAvailableRecommendedEndpoints: boolean;
  isUsingRecommendedDefaults: boolean;
  isDisableModalOpen: boolean;
  isResetModalOpen: boolean;
  toggleRecommendedDefaults: (checked: boolean) => void;
  confirmDisableRecommendedDefaults: () => void;
  confirmResetToDefaults: () => void;
  closeDisableModal: () => void;
  closeResetModal: () => void;
}

/**
 * Tracks whether a sub-feature uses its recommended defaults and handles turning them off and resetting to them.
 */
export const useRecommendedDefaults = ({
  featureId,
  endpointIds,
  effectiveRecommendedEndpoints,
  efforts,
  effectiveRecommendedEfforts,
  regionDeniedEndpointIds,
  onEndpointsChange,
  onEffortsChange,
  discardVersion,
}: UseRecommendedDefaultsParams): RecommendedDefaults => {
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  // Sticky session flag: the editable list is seeded with the recommended endpoints, so without this
  // the toggle would snap back to ON immediately after the user confirms "Turn off recommended defaults".
  const [hasOptedIntoCustomMode, setHasOptedIntoCustomMode] = useState(false);
  useEffect(() => {
    // Discarding restores the saved assignments, so the card must also leave custom mode.
    setHasOptedIntoCustomMode(false);
  }, [discardVersion]);

  const availableRecommendedEndpointIds = useMemo(
    () =>
      effectiveRecommendedEndpoints.filter(
        (endpointId) => !regionDeniedEndpointIds.has(endpointId)
      ),
    [effectiveRecommendedEndpoints, regionDeniedEndpointIds]
  );
  const hasAvailableRecommendedEndpoints = availableRecommendedEndpointIds.length > 0;

  const matchesRecommendedDefaults = useMemo(() => {
    const matchesRecommendedEndpoints = arraysEqual(endpointIds, effectiveRecommendedEndpoints);
    const matchesRecommendedSelection =
      matchesRecommendedEndpoints && isEqual(efforts, effectiveRecommendedEfforts);
    return !hasOptedIntoCustomMode && matchesRecommendedSelection;
  }, [
    hasOptedIntoCustomMode,
    endpointIds,
    effectiveRecommendedEndpoints,
    efforts,
    effectiveRecommendedEfforts,
  ]);
  const isUsingRecommendedDefaults = hasAvailableRecommendedEndpoints && matchesRecommendedDefaults;

  const toggleRecommendedDefaults = useCallback(
    (checked: boolean) => {
      if (checked) {
        if (!isUsingRecommendedDefaults) {
          setIsResetModalOpen(true);
        }
        return;
      }
      setIsDisableModalOpen(true);
    },
    [isUsingRecommendedDefaults]
  );

  const confirmResetToDefaults = useCallback(() => {
    setHasOptedIntoCustomMode(false);
    onEndpointsChange(featureId, [...effectiveRecommendedEndpoints]);
    onEffortsChange(featureId, { ...effectiveRecommendedEfforts });
    setIsResetModalOpen(false);
  }, [
    featureId,
    effectiveRecommendedEndpoints,
    effectiveRecommendedEfforts,
    onEndpointsChange,
    onEffortsChange,
  ]);

  const confirmDisableRecommendedDefaults = useCallback(() => {
    setHasOptedIntoCustomMode(true);
    onEndpointsChange(featureId, [...availableRecommendedEndpointIds]);
    setIsDisableModalOpen(false);
  }, [featureId, availableRecommendedEndpointIds, onEndpointsChange]);

  const closeDisableModal = useCallback(() => setIsDisableModalOpen(false), []);
  const closeResetModal = useCallback(() => setIsResetModalOpen(false), []);

  return {
    hasAvailableRecommendedEndpoints,
    isUsingRecommendedDefaults,
    isDisableModalOpen,
    isResetModalOpen,
    toggleRecommendedDefaults,
    confirmDisableRecommendedDefaults,
    confirmResetToDefaults,
    closeDisableModal,
    closeResetModal,
  };
};
