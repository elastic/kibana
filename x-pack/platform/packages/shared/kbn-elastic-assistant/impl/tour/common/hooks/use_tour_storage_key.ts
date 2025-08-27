/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAssistantSpaceId } from '../../../assistant/use_space_aware_context';
import {
  NEW_TOUR_FEATURES_TOUR_STORAGE_KEYS,
  type NEW_FEATURES_TOUR_STORAGE_KEYS,
} from '../../const';

/**
 *
 * @param featureKey The key of the feature for storage key
 * @returns A unique storage key for the feature based on the space ID
 */
export const useTourStorageKey = (featureKey: NEW_FEATURES_TOUR_STORAGE_KEYS) => {
  const spaceId = useAssistantSpaceId();
  return `${NEW_TOUR_FEATURES_TOUR_STORAGE_KEYS[featureKey]}.${spaceId}`;
};
