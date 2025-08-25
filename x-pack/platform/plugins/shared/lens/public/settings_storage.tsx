/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IStorageWrapper, Storage } from '@kbn/kibana-utils-plugin/public';

export interface LocalStorageLens {
  indexPatternId?: string;
  skipDeleteModal?: boolean;
  userChartType?: string;
}

export const LOCAL_STORAGE_LENS_KEY = 'lens-settings';

export const LENS_STORAGE_KEYS = {
  USER_CHART_TYPE: 'userChartType',
  INDEX_PATTERN_ID: 'indexPatternId',
  SKIP_DELETE_MODAL: 'skipDeleteModal',
} as const;

/**
 * Read a value from the Lens settings in localStorage
 */
export const readFromStorage = (storage: IStorageWrapper, key: string) => {
  const data = storage.get(LOCAL_STORAGE_LENS_KEY);
  return data && data[key];
};

/**
 * Write a value to the Lens settings in localStorage
 */
export const writeToStorage = (storage: IStorageWrapper, key: string, value: string) => {
  storage.set(LOCAL_STORAGE_LENS_KEY, { ...storage.get(LOCAL_STORAGE_LENS_KEY), [key]: value });
};

/**
 * Delete a value from the Lens settings in localStorage
 */
export const deleteFromStorage = (storage: IStorageWrapper, key: string) => {
  const currentData = storage.get(LOCAL_STORAGE_LENS_KEY) || {};
  const { [key]: deleted, ...rest } = currentData;
  storage.set(LOCAL_STORAGE_LENS_KEY, rest);
};

// Convenience functions
/**
 * Get the user's preferred chart type from localStorage
 */
export const getUserChartTypeFromLocalStorage = (): string | null => {
  const storage = new Storage(localStorage);
  return readFromStorage(storage, LENS_STORAGE_KEYS.USER_CHART_TYPE);
};

/**
 * Set the user's preferred chart type in localStorage
 */
export const setUserChartTypeToLocalStorage = (chartType: string) => {
  const storage = new Storage(localStorage);
  writeToStorage(storage, LENS_STORAGE_KEYS.USER_CHART_TYPE, chartType);
};

/**
 * Remove the user's preferred chart type from localStorage
 */
export const removeUserChartTypeFromLocalStorage = () => {
  const storage = new Storage(localStorage);
  deleteFromStorage(storage, LENS_STORAGE_KEYS.USER_CHART_TYPE);
};
