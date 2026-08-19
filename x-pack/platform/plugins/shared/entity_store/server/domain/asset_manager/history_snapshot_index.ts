/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEntityIndexPattern,
  getLegacySecurityEntityIndexPattern,
  ENTITY_HISTORY,
  ENTITY_SCHEMA_VERSION_V2,
} from '../../../common/domain/entity_index';

/**
 * Base index pattern for history snapshot indices in a namespace.
 * Actual indices have a date-hour suffix, e.g. ".entities.v2.history.default.2025-02-27-14"
 */
const getHistorySnapshotBasePattern = (namespace: string): string =>
  getEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_HISTORY,
    namespace,
  });

/**
 * @deprecated Legacy Security-scoped history base; used only for upgrade migration.
 * Concrete indices: `.entities.v2.history.security_{namespace}.<YYYY-MM-DD>-<HH>`
 */
const getLegacySecurityHistorySnapshotBasePattern = (namespace: string): string =>
  getLegacySecurityEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_HISTORY,
    namespace,
  });

const toHistorySnapshotDateHour = (historySnapshotDate: Date): string => {
  const y = historySnapshotDate.getUTCFullYear();
  const m = String(historySnapshotDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(historySnapshotDate.getUTCDate()).padStart(2, '0');
  const h = String(historySnapshotDate.getUTCHours()).padStart(2, '0');
  return `${y}-${m}-${d}-${h}`;
};

/**
 * Returns the history snapshot index name for a given namespace and date (with hour).
 * Format: .entities.v2.history.<namespace>.<YYYY-MM-DD>-<HH>
 * Hour is included so sub-daily frequencies (e.g. 12h, 1h) use distinct indices.
 */
export const getHistorySnapshotIndexName = (namespace: string, historySnapshotDate: Date): string =>
  `${getHistorySnapshotBasePattern(namespace)}.${toHistorySnapshotDateHour(historySnapshotDate)}`;

/** @deprecated Legacy Security-scoped history index name; used until migration deletes those indices. */
export const getLegacySecurityHistorySnapshotIndexName = (
  namespace: string,
  historySnapshotDate: Date
): string =>
  `${getLegacySecurityHistorySnapshotBasePattern(namespace)}.${toHistorySnapshotDateHour(
    historySnapshotDate
  )}`;

/**
 * Returns the index pattern matching all history snapshot indices for a namespace.
 * Concrete names are `<base>.<YYYY-MM-DD>-<HH>`.
 * Used for delete, status, and the history index template.
 */
export const getHistorySnapshotIndexPattern = (namespace: string): string =>
  `${getHistorySnapshotBasePattern(namespace)}.*`;

/**
 * @deprecated Legacy Security-scoped history pattern; used only for upgrade migration.
 */
export const getLegacySecurityHistorySnapshotIndexPattern = (namespace: string): string =>
  `${getLegacySecurityHistorySnapshotBasePattern(namespace)}.*`;

/**
 * Maps a legacy Security-scoped history index name to the solution-neutral name,
 * preserving the date-hour suffix.
 */
export const toNeutralHistorySnapshotIndexName = (
  legacyIndex: string,
  namespace: string
): string => {
  const legacyPrefix = `${getLegacySecurityHistorySnapshotBasePattern(namespace)}.`;
  if (!legacyIndex.startsWith(legacyPrefix)) {
    throw new Error(
      `Expected legacy history index starting with ${legacyPrefix}, got ${legacyIndex}`
    );
  }
  return `${getHistorySnapshotBasePattern(namespace)}.${legacyIndex.slice(legacyPrefix.length)}`;
};
