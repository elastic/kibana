/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const USER_CHART_TYPE_KEY = 'userChartType';

/**
 * Set the user's preferred chart type in sessionStorage
 */
export function saveUserChartTypeToSessionStorage(chartType: string): void {
  try {
    sessionStorage.setItem(USER_CHART_TYPE_KEY, chartType);
  } catch (e) {
    // do nothing
  }
}

/**
 * Get the user's preferred chart type from sessionStorage
 */
export function readUserChartTypeFromSessionStorage(): string | null {
  try {
    return sessionStorage.getItem(USER_CHART_TYPE_KEY);
  } catch (e) {
    return null;
  }
}

/**
 * Remove the user's preferred chart type from sessionStorage
 */
export function deleteUserChartTypeFromSessionStorage(): void {
  try {
    sessionStorage.removeItem(USER_CHART_TYPE_KEY);
  } catch (e) {
    // do nothing
  }
}
