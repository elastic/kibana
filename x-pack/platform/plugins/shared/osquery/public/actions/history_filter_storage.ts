/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const STORAGE_KEY = 'osquery:historyFilters';

export const saveHistoryFilters = (qs: string): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, qs);
  } catch {
    // sessionStorage may be unavailable (e.g. private browsing quota exceeded)
  }
};

export const getHistoryFilters = (): string => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};
