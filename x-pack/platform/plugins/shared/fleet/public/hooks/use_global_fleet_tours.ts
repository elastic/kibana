/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useReducer } from 'react';

import { TOUR_STORAGE_KEYS } from '../constants';

import { useStartServices } from './use_core';

type GlobalTourKey = keyof Pick<
  typeof TOUR_STORAGE_KEYS,
  'AUTO_UPGRADE_AGENTS' | 'AGENT_EXPORT_CSV' | 'INACTIVE_AGENTS'
>;

export interface FleetTourConfig {
  key: GlobalTourKey;
  priority: number; // Lower numbers = higher priority
  isInitialized: boolean;
  isDismissed: boolean;
  isConditionMet: () => boolean;
}

// Global registry shared across all hook instances
// And a set of listeners to update all components that use this hook
const registryListeners: Set<() => void> = new Set();
let globalTourRegistry: Record<GlobalTourKey, FleetTourConfig> | null = null;
const initializeGlobalRegistry = (storage: any): Record<GlobalTourKey, FleetTourConfig> => {
  if (!globalTourRegistry) {
    globalTourRegistry = {
      AUTO_UPGRADE_AGENTS: {
        key: 'AUTO_UPGRADE_AGENTS',
        priority: 100,
        isInitialized: false,
        isDismissed: storage.get(TOUR_STORAGE_KEYS.AUTO_UPGRADE_AGENTS)?.active === false,
        isConditionMet: () => false,
      },
      AGENT_EXPORT_CSV: {
        key: 'AGENT_EXPORT_CSV',
        priority: 200,
        isInitialized: false,
        isDismissed: storage.get(TOUR_STORAGE_KEYS.AGENT_EXPORT_CSV)?.active === false,
        isConditionMet: () => false,
      },
      INACTIVE_AGENTS: {
        key: 'INACTIVE_AGENTS',
        priority: 400,
        isInitialized: false,
        isDismissed: storage.get(TOUR_STORAGE_KEYS.INACTIVE_AGENTS)?.active === false,
        isConditionMet: () => false,
      },
    };
  }
  return globalTourRegistry;
};

const updateGlobalRegistry = (tourKey: GlobalTourKey, updates: Partial<FleetTourConfig>) => {
  if (globalTourRegistry && globalTourRegistry[tourKey].isInitialized === false) {
    globalTourRegistry[tourKey] = {
      ...globalTourRegistry[tourKey],
      ...updates,
    };
    // Notify all listeners of the change (this will re-render all components)
    registryListeners.forEach((listener) => listener());
  }
};

/**
 * Hook to manage global Fleet tours so that they are only shown one at a time.
 * See above global registry for what is considered a "global tour" and their priorities (order in which they are shown).
 * This hook should be used in any component that needs to show a global tour that has risk of overlapping with other tours.
 * Note that this does not wrap them as a "guided tour" (with steps and "Next" buttons), each tour is considered
 * a single dismissable step.
 */
export function useGlobalFleetTours(
  tourKey: GlobalTourKey,
  tourOverride: Partial<FleetTourConfig>
) {
  const { storage, uiSettings } = useStartServices();
  const isGloballyHidden = uiSettings.get('hideAnnouncements', false);

  // Needed to force re-render when registry changes (since it's outside this scope)
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  // Initialize global registry on first use
  initializeGlobalRegistry(storage);

  // Subscribe to registry changes to trigger re-renders
  useEffect(() => {
    const listener = () => forceUpdate();
    registryListeners.add(listener);
    return () => {
      registryListeners.delete(listener);
    };
  }, []);

  // Helper fn to update listeners
  const updateListeners = useCallback(() => {
    registryListeners.forEach((listener) => listener());
  }, []);

  // Update this registered tour in the global registry
  useEffect(() => {
    updateGlobalRegistry(tourKey, {
      ...tourOverride,
      isInitialized: true,
    });
    updateListeners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // All eligible active global tours
  const getEligibleTours = useCallback((): FleetTourConfig[] => {
    return isGloballyHidden || !globalTourRegistry
      ? []
      : Object.values(globalTourRegistry)
          .filter((tour) => {
            return tour.isInitialized && !tour.isDismissed && tour.isConditionMet();
          })
          .sort((a, b) => a.priority - b.priority);
  }, [isGloballyHidden]);

  // The current active tour (first in sequence)
  const getActiveTour = useCallback((): FleetTourConfig | null => {
    return getEligibleTours()[0] || null;
  }, [getEligibleTours]);

  // Return if this registered tour should be shown (is it currently the active tour?)
  const shouldShowTour = useCallback((): boolean => {
    return getActiveTour()?.key === tourKey;
  }, [getActiveTour, tourKey]);

  // Go to next tour in sequence
  const nextTour = useCallback(() => {
    const activeTour = getActiveTour();
    if (activeTour && globalTourRegistry) {
      globalTourRegistry[activeTour.key] = {
        ...globalTourRegistry[activeTour.key],
        isDismissed: true,
      };
      storage.set(TOUR_STORAGE_KEYS[activeTour.key], { active: false });
      updateListeners();
    }
  }, [getActiveTour, storage, updateListeners]);

  return {
    shouldShowTour,
    nextTour,
  };
}
