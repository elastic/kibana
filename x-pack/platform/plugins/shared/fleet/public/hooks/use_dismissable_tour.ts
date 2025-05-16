/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { type TourKey, type TourConfig, TOUR_STORAGE_KEYS } from '../constants';

import { useStartServices } from './use_core';

export function useDismissableTour(tourKey: TourKey) {
  const { storage, uiSettings } = useStartServices();

  const defaultValue =
    uiSettings.get('hideAnnouncements', false) ||
    (storage.get(TOUR_STORAGE_KEYS[tourKey]) as TourConfig | undefined)?.active === false;

  const [isHidden, setIsHidden] = React.useState(defaultValue);

  const dismiss = React.useCallback(() => {
    setIsHidden(true);
    storage.set(TOUR_STORAGE_KEYS[tourKey], {
      active: false,
    });
  }, [tourKey, storage]);

  return {
    isHidden,
    dismiss,
  };
}
