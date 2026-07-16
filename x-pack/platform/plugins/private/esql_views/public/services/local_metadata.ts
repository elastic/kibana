/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Elasticsearch's `_query/view` API only persists `{ name, query }`. Everything else shown in
 * this prototype's table (description, creator, last-updated time) has no real backing store,
 * so it's cached here, in the browser, keyed by view name. This is a best-effort companion to
 * the real API, not a source of truth: it survives page refreshes but not a cleared browser
 * storage, and it isn't shared across browsers/users.
 */

const STORAGE_KEY = 'esqlViews.localMetadata.v1';

export interface EsqlViewLocalMetadata {
  description?: string;
  createdBy?: string;
  lastUpdated?: string;
  /** Cached copy of the query, so the table can render it without a round trip per row. */
  query?: string;
}

type MetadataMap = Record<string, EsqlViewLocalMetadata>;

const readAll = (): MetadataMap => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeAll = (map: MetadataMap): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Best-effort only (private browsing, storage quota, etc.) \u2014 safe to ignore.
  }
};

export const getAllLocalViewMetadata = (): MetadataMap => readAll();

export const setLocalViewMetadata = (name: string, metadata: EsqlViewLocalMetadata): void => {
  const all = readAll();
  all[name] = { ...all[name], ...metadata };
  writeAll(all);
};

export const removeLocalViewMetadata = (name: string): void => {
  const all = readAll();
  delete all[name];
  writeAll(all);
};
