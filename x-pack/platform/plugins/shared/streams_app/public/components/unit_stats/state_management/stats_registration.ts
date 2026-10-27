/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { mapValues, pickBy } from 'lodash';
import type { StatsWindow } from '../../../services/unit_stats_client/types';
import type { ComponentRecord, StatsComponentState, StatsWindows, StatsWindowState } from './types';

export const getWindowKey = (window: StatsWindow): string =>
  window.kind === 'default' ? 'default' : `${window.start}/${window.end}`;

const createWindowState = (window: StatsWindow): StatsWindowState => ({
  window,
  destination: {},
  processor: {},
});

// Registration

type RegistrantsUpdate = (registrants: readonly string[]) => readonly string[];

// Both updates return the list they got when there is nothing to change, so they are idempotent.
const addRegistrant =
  (registrant: string): RegistrantsUpdate =>
  (registrants) =>
    registrants.includes(registrant) ? registrants : [...registrants, registrant];

const removeRegistrant =
  (registrant: string): RegistrantsUpdate =>
  (registrants) =>
    registrants.includes(registrant)
      ? registrants.filter((existing) => existing !== registrant)
      : registrants;

const changeRegistrants = <TStats>(
  record: ComponentRecord<TStats>,
  id: string,
  update: RegistrantsUpdate
): ComponentRecord<TStats> => {
  const current = record[id] ?? { registrants: [] };
  const registrants = update(current.registrants);
  return registrants === current.registrants
    ? record
    : { ...record, [id]: { ...current, registrants } };
};

const withComponentRegistrants = (
  windowState: StatsWindowState,
  ref: StreamsUnit.StatsComponentRef,
  update: RegistrantsUpdate
): StatsWindowState => {
  switch (ref.kind) {
    case 'destination':
      return {
        ...windowState,
        destination: changeRegistrants(windowState.destination, ref.id, update),
      };
    case 'processor':
      return {
        ...windowState,
        processor: changeRegistrants(windowState.processor, ref.id, update),
      };
    default:
      return windowState;
  }
};

export const registerComponent = (
  windows: StatsWindows,
  ref: StreamsUnit.StatsComponentRef,
  window: StatsWindow,
  registrant: string
): StatsWindows => {
  const windowKey = getWindowKey(window);
  const windowState = windows[windowKey] ?? createWindowState(window);
  return {
    ...windows,
    [windowKey]: withComponentRegistrants(windowState, ref, addRegistrant(registrant)),
  };
};

/** There is interest in a component while at least one consumer shows it. */
export const hasRegistrants = <TStats>({ registrants }: StatsComponentState<TStats>): boolean =>
  registrants.length > 0;

/**
 * Keeps a component that someone shows, or that holds a value. A component that nobody shows and
 * that has no value, or only a request in flight, has nothing to keep.
 */
const pruneUnusedKind = <TStats>(record: ComponentRecord<TStats>): ComponentRecord<TStats> =>
  pickBy(
    record,
    (state) =>
      hasRegistrants(state) || (state.entry !== undefined && state.entry.status !== 'loading')
  );

const isWindowEmpty = ({ destination, processor }: StatsWindowState): boolean =>
  Object.keys(destination).length === 0 && Object.keys(processor).length === 0;

/** Removes every component that has nothing to keep, then every window left with nothing. */
export const pruneUnusedWindows = (windows: StatsWindows): StatsWindows =>
  pickBy(
    mapValues(windows, (windowState) => ({
      ...windowState,
      destination: pruneUnusedKind(windowState.destination),
      processor: pruneUnusedKind(windowState.processor),
    })),
    (windowState) => !isWindowEmpty(windowState)
  );

/**
 * Removes the interest of one registrant. A value that was fetched stays cached, so a node that
 * comes back shows it at once. A window left with nothing is removed.
 */
export const unregisterComponent = (
  windows: StatsWindows,
  ref: StreamsUnit.StatsComponentRef,
  window: StatsWindow,
  registrant: string
): StatsWindows => {
  const windowKey = getWindowKey(window);
  const windowState = windows[windowKey];
  if (!windowState) return windows;

  return pruneUnusedWindows({
    ...windows,
    [windowKey]: withComponentRegistrants(windowState, ref, removeRegistrant(registrant)),
  });
};

/** Whether any consumer still shows this component in this window. */
export const isRegistered = (
  windowState: StatsWindowState | undefined,
  ref: StreamsUnit.StatsComponentRef
): boolean => {
  switch (ref.kind) {
    case 'destination': {
      const state = windowState?.destination[ref.id];
      return state !== undefined && hasRegistrants(state);
    }
    case 'processor': {
      const state = windowState?.processor[ref.id];
      return state !== undefined && hasRegistrants(state);
    }
    default:
      return false;
  }
};
