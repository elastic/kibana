/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { isEqual, mapValues, pickBy } from 'lodash';
import type {
  MappedComponentStats,
  MappedStatsResponse,
} from '../../../services/unit_stats_client/types';
import { STATS_REQUEST_FAILED_ERROR_CODE } from './constants';
import { hasRegistrants, pruneUnusedComponents } from './stats_registration';
import type { ComponentRecord, StatsBatch, StatsComponents, StatsEntry } from './types';

const LOADING_ENTRY: StatsEntry<never> = { status: 'loading' };

interface IdsByKind {
  destination: string[];
  processor: string[];
}

/** Buckets the ids of a request by kind in one pass. A kind this UI does not know is dropped. */
const groupIdsByKind = (components: StreamsUnit.StatsComponentRef[]): IdsByKind => {
  const destination: string[] = [];
  const processor: string[] = [];

  for (const { kind, id } of components) {
    switch (kind) {
      case 'destination':
        destination.push(id);
        break;
      case 'processor':
        processor.push(id);
        break;
      default:
        break;
    }
  }

  return { destination, processor };
};

const markLoadingKind = <TStats>(
  record: ComponentRecord<TStats>,
  ids: string[]
): ComponentRecord<TStats> => {
  const next = { ...record };
  for (const id of ids) {
    const current = record[id];
    if (current && (!current.entry || current.entry.status === 'error')) {
      next[id] = { ...current, entry: LOADING_ENTRY };
    }
  }
  return next;
};

/**
 * Marks the components of a request that is about to start. Only a component without a value, or
 * with an error, shows as loading. A component that has a value keeps it while the refresh runs.
 */
export const markBatchLoading = (
  components: StatsComponents,
  batch: StatsBatch
): StatsComponents => {
  const ids = groupIdsByKind(batch.components);

  return {
    destination: markLoadingKind(components.destination, ids.destination),
    processor: markLoadingKind(components.processor, ids.processor),
  };
};

const mergeResultsKind = <TStats>(
  record: ComponentRecord<TStats>,
  ids: string[],
  results: Record<string, MappedComponentStats<TStats>>,
  now: number
): ComponentRecord<TStats> => {
  const next = { ...record };
  for (const id of ids) {
    const result = results[id];
    if (!result) continue;

    const current = record[id] ?? { registrants: [] };
    const entry: StatsEntry<TStats> = {
      status: result.status,
      stats: result.stats,
      ...(result.error ? { error: result.error } : {}),
    };
    next[id] = {
      ...current,
      // Equal values keep the old object, so a selector returns the same reference and nothing re-renders.
      entry: isEqual(current.entry, entry) ? current.entry : entry,
      fetchedAt: now,
    };
  }
  return next;
};

/** Writes the result of a request into the entries of its components, and stamps when it arrived. */
export const mergeFetchedStats = (
  components: StatsComponents,
  batch: StatsBatch,
  response: MappedStatsResponse,
  now: number
): StatsComponents => {
  const ids = groupIdsByKind(batch.components);

  return {
    destination: mergeResultsKind(
      components.destination,
      ids.destination,
      response.destinations,
      now
    ),
    processor: mergeResultsKind(components.processor, ids.processor, response.processors, now),
  };
};

const markFailedKind = <TStats>(
  record: ComponentRecord<TStats>,
  ids: string[],
  reason: string
): ComponentRecord<TStats> => {
  const next = { ...record };
  for (const id of ids) {
    const current = record[id];
    if (!current) continue;

    const { entry } = current;
    if (!entry || entry.status === 'loading') {
      next[id] = {
        ...current,
        entry: { status: 'error', error: { code: STATS_REQUEST_FAILED_ERROR_CODE, reason } },
      };
    } else if (entry.status === 'ready' || entry.status === 'noData') {
      next[id] = { ...current, entry: { ...entry, status: 'stale' } };
    }
  }
  return next;
};

/**
 * Applies a request that failed as a whole. A component with a value keeps it, marked stale. A
 * component without one shows an error. A component error stays, because it is a better reason
 * than a failed refresh, and a value that is already stale stays as it is.
 */
export const markBatchFailed = (
  components: StatsComponents,
  batch: StatsBatch,
  reason: string
): StatsComponents => {
  const ids = groupIdsByKind(batch.components);

  return {
    destination: markFailedKind(components.destination, ids.destination, reason),
    processor: markFailedKind(components.processor, ids.processor, reason),
  };
};

const keepIdsKind = <TStats>(
  record: ComponentRecord<TStats>,
  ids: ReadonlySet<string>
): ComponentRecord<TStats> => pickBy(record, (_state, id) => ids.has(id));

/**
 * Applies a saved unit. A component that is no longer in the unit is dropped, with its value and
 * its registrants. Nothing is dropped for a change to a route: a refetch reads the same window.
 */
export const dropRemovedComponents = (
  components: StatsComponents,
  componentIds: ReadonlySet<string>
): StatsComponents =>
  pruneUnusedComponents({
    destination: keepIdsKind(components.destination, componentIds),
    processor: keepIdsKind(components.processor, componentIds),
  });

/** Keeps who shows the component and drops its value, so it is requested again. */
const clearValuesKind = <TStats>(record: ComponentRecord<TStats>): ComponentRecord<TStats> =>
  mapValues(pickBy(record, hasRegistrants), ({ registrants }) => ({ registrants }));

/**
 * Drops every value, because they describe a window that is no longer the one shown. A component
 * that someone shows stays, without a value, so it is due. A component that only held a cached
 * value is dropped.
 */
export const clearValues = (components: StatsComponents): StatsComponents => ({
  destination: clearValuesKind(components.destination),
  processor: clearValuesKind(components.processor),
});
