/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { type TourKey, type TourConfig, TOUR_STORAGE_KEYS } from '../constants';

import { useStartServices } from './use_core';
import { useTourManager } from './use_tour_manager';

/**
 * Hook for managing dismissible tours in Fleet.
 * This uses the TourManager to ensure only one tour is displayed at a time.
 * @param tourKey - The key identifying the tour in storage
 * @param enabled - Additional condition that must be true for the tour to show
 */
export function useDismissableTour(tourKey: TourKey, enabled: boolean = true) {
  const { storage, notifications } = useStartServices();
  const { activeTour, setActiveTour } = useTourManager();

  const defaultValue =
    !notifications.tours.isEnabled() ||
    (storage.get(TOUR_STORAGE_KEYS[tourKey]) as TourConfig | undefined)?.active === false;

  const [isHidden, setIsHidden] = React.useState(defaultValue);

  // Check if this tour should be shown (not hidden, enabled, and is the active tour or no tour manager)
  const isOpen = !isHidden && enabled && (activeTour === tourKey || activeTour === null);

  // Request to show this tour when it should be visible and no other tour is active
  React.useEffect(() => {
    if (!isHidden && enabled && activeTour === null && setActiveTour) {
      setActiveTour(tourKey);
    }
  }, [isHidden, enabled, activeTour, setActiveTour, tourKey]);

  const dismiss = React.useCallback(() => {
    setIsHidden(true);
    storage.set(TOUR_STORAGE_KEYS[tourKey], {
      active: false,
    });
    // Clear this tour as active when dismissed
    if (activeTour === tourKey && setActiveTour) {
      setActiveTour(null);
    }
  }, [tourKey, storage, activeTour, setActiveTour]);

  return {
    isHidden,
    isOpen,
    dismiss,
  };
}
