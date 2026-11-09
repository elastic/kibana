/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useKibana } from './use_kibana';

export const EIS_DISPLAY_OPTIONS_TOUR_STORAGE_KEY =
  'xpack.searchInferenceEndpoints.eisDisplayOptionsTour.dismissed';

export interface UseDisplayOptionsTourResult {
  isTourOpen: boolean;
  dismissTour: () => void;
  hideTour: () => void;
}

const readTourDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(EIS_DISPLAY_OPTIONS_TOUR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeTourDismissed = () => {
  try {
    window.localStorage.setItem(EIS_DISPLAY_OPTIONS_TOUR_STORAGE_KEY, 'true');
  } catch {
    return;
  }
};

export const useDisplayOptionsTour = (hasBlockedModels: boolean): UseDisplayOptionsTourResult => {
  const {
    services: { notifications },
  } = useKibana();
  const [isTourDismissed, setIsTourDismissed] = useState(readTourDismissed);
  const [isTourHidden, setIsTourHidden] = useState(false);

  const dismissTour = useCallback(() => {
    writeTourDismissed();
    setIsTourDismissed(true);
  }, []);

  const hideTour = useCallback(() => {
    setIsTourHidden(true);
  }, []);

  const areToursEnabled = notifications?.tours?.isEnabled() ?? true;
  const isTourSuppressed = isTourDismissed || isTourHidden;
  const isTourEligible = hasBlockedModels && !isTourSuppressed;
  const isTourOpen = isTourEligible && areToursEnabled;

  return { isTourOpen, dismissTour, hideTour };
};
