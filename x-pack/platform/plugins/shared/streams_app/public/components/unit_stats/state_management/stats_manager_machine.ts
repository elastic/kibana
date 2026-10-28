/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type { MappedStatsResponse, StatsWindow } from '../../../services/unit_stats_client/types';
import type { StatsBatch, StatsComponents } from './types';

export interface StatsManagerInput {
  /**
   * Resolves the window to fetch. The machine calls it at every flush, so every component in a
   * flush shares one window, and a relative range such as "last 15 minutes" slides with each poll.
   */
  getWindow: () => StatsWindow;
}

export interface StatsManagerContext {
  getWindow: () => StatsWindow;
  /** Every component that is shown or cached, by kind and id. */
  components: StatsComponents;
  /** The requests in flight by id, so a result is applied to the components it asked for. */
  requests: Record<string, StatsBatch>;
  /** Makes the id of the next request. */
  requestSequence: number;
  lastUpdated?: number;
  /** Failed requests in a row. A result resets it. */
  consecutiveFailures: number;
}

// Sent by consumers

export interface StatsRegisterEvent {
  type: 'stats.register';
  ref: StreamsUnit.StatsComponentRef;
  /** Who shows the component. The hook makes it, so a repeated event changes nothing. */
  registrant: string;
}

export interface StatsUnregisterEvent {
  type: 'stats.unregister';
  ref: StreamsUnit.StatsComponentRef;
  registrant: string;
}

/** The user asks for fresh values. It also restarts polling after it stopped. */
export interface StatsRefreshEvent {
  type: 'stats.refresh';
}

/** A unit was saved. The ids are every component of the saved unit. */
export interface StatsUnitPersistedEvent {
  type: 'stats.unitPersisted';
  componentIds: string[];
}

// Sent by the environment

/** The shared time state changed. The entries describe the old range, so they are cleared. */
export interface StatsWindowChangedEvent {
  type: 'stats.windowChanged';
}

export interface StatsVisibilityChangeEvent {
  type: 'visibility.change';
  visible: boolean;
}

// Sent by a fetch actor

export interface StatsFetchDoneEvent {
  type: 'stats.fetch.done';
  requestId: string;
  response: MappedStatsResponse;
}

export interface StatsFetchFailedEvent {
  type: 'stats.fetch.failed';
  requestId: string;
  reason: string;
}

export type StatsManagerEvent =
  | StatsRegisterEvent
  | StatsUnregisterEvent
  | StatsRefreshEvent
  | StatsUnitPersistedEvent
  | StatsWindowChangedEvent
  | StatsVisibilityChangeEvent
  | StatsFetchDoneEvent
  | StatsFetchFailedEvent;
