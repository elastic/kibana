/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type {
  DestinationStatsView,
  ProcessorStatsView,
  StatsStatus,
  StatsWindow,
} from '../../../services/unit_stats_client/types';

export interface StatsEntry<TStats> {
  status: StatsStatus;
  /** Kept while `stale`, so a failed refresh does not blank a node. */
  stats?: TStats;
  error?: StreamsUnit.StatsError;
}

export interface StatsComponentState<TStats> {
  /**
   * The ids of the mounted consumers that show this component. There is interest while the list is
   * not empty. When it is empty the value stays cached, but nothing fetches it.
   */
  registrants: readonly string[];
  entry?: StatsEntry<TStats>;
  /** Kept next to the entry, so a refresh with equal values keeps the same entry object. */
  fetchedAt?: number;
}

/** The components of one kind in one window, by id. */
export type ComponentRecord<TStats> = Record<string, StatsComponentState<TStats>>;

/** The components of one window. A kind has its own record, so each entry is typed by kind. */
export interface StatsWindowState {
  window: StatsWindow;
  destination: Record<string, StatsComponentState<DestinationStatsView>>;
  processor: Record<string, StatsComponentState<ProcessorStatsView>>;
}

/** Keyed by window key. The Map has one window. A table has one per picker range it showed. */
export type StatsWindows = Record<string, StatsWindowState>;

/** One request: the components of one window, at most `MAX_STREAMS_UNIT_STATS_COMPONENTS`. */
export interface StatsBatch {
  windowKey: string;
  window: StatsWindow;
  components: StreamsUnit.StatsComponentRef[];
}
