/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { pickBy } from 'lodash';
import type { ComponentRecord, StatsComponents, StatsComponentState } from './types';

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

/**
 * Reads a component by id from its own keys only. An id is user-defined, so a plain lookup would
 * read `constructor` or `toString` from `Object.prototype` and return that as the component.
 */
export const getComponentState = <TStats>(
  record: ComponentRecord<TStats>,
  id: string
): StatsComponentState<TStats> | undefined => (Object.hasOwn(record, id) ? record[id] : undefined);

const changeRegistrants = <TStats>(
  record: ComponentRecord<TStats>,
  id: string,
  update: RegistrantsUpdate
): ComponentRecord<TStats> => {
  const current = getComponentState(record, id) ?? { registrants: [] };
  const registrants = update(current.registrants);
  return registrants === current.registrants
    ? record
    : { ...record, [id]: { ...current, registrants } };
};

const withComponentRegistrants = (
  components: StatsComponents,
  ref: StreamsUnit.StatsComponentRef,
  update: RegistrantsUpdate
): StatsComponents => {
  switch (ref.kind) {
    case 'destination':
      return {
        ...components,
        destination: changeRegistrants(components.destination, ref.id, update),
      };
    case 'processor':
      return {
        ...components,
        processor: changeRegistrants(components.processor, ref.id, update),
      };
    default:
      return components;
  }
};

export const registerComponent = (
  components: StatsComponents,
  ref: StreamsUnit.StatsComponentRef,
  registrant: string
): StatsComponents => withComponentRegistrants(components, ref, addRegistrant(registrant));

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

/** Removes every component that has nothing to keep. */
export const pruneUnusedComponents = (components: StatsComponents): StatsComponents => ({
  destination: pruneUnusedKind(components.destination),
  processor: pruneUnusedKind(components.processor),
});

/**
 * Removes the interest of one registrant. A value that was fetched stays cached, so a node that
 * comes back shows it at once.
 */
export const unregisterComponent = (
  components: StatsComponents,
  ref: StreamsUnit.StatsComponentRef,
  registrant: string
): StatsComponents =>
  pruneUnusedComponents(withComponentRegistrants(components, ref, removeRegistrant(registrant)));

/** Whether any consumer still shows this component. */
export const isRegistered = (
  components: StatsComponents,
  ref: StreamsUnit.StatsComponentRef
): boolean => {
  switch (ref.kind) {
    case 'destination': {
      const state = getComponentState(components.destination, ref.id);
      return state !== undefined && hasRegistrants(state);
    }
    case 'processor': {
      const state = getComponentState(components.processor, ref.id);
      return state !== undefined && hasRegistrants(state);
    }
    default:
      return false;
  }
};
