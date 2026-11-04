/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type { DestinationStatsView } from '../../../services/unit_stats_client/types';
import {
  hasRegistrants,
  isRegistered,
  registerComponent,
  unregisterComponent,
} from './stats_registration';
import type { StatsComponents, StatsEntry } from './types';

const EMPTY: StatsComponents = { destination: {}, processor: {} };

const destination = (id: string): StreamsUnit.StatsComponentRef => ({ kind: 'destination', id });
const processor = (id: string): StreamsUnit.StatsComponentRef => ({ kind: 'processor', id });

const READY_ENTRY: StatsEntry<DestinationStatsView> = {
  status: 'ready',
  stats: {
    eventsRate: 3700,
    eventsTotal: 3330000,
    failedRate: 0,
    latencyAverage: 0.012,
    series: { bucketMs: 300000, points: [] },
  },
};

/** Sets a value on a destination that is already registered. */
const withDestinationEntry = (
  components: StatsComponents,
  id: string,
  entry: StatsEntry<DestinationStatsView>
): StatsComponents => ({
  ...components,
  destination: {
    ...components.destination,
    [id]: { ...components.destination[id], entry, fetchedAt: 1 },
  },
});

describe('registerComponent', () => {
  it('creates the component with its registrant', () => {
    const components = registerComponent(EMPTY, destination('es-prod'), 'node-a');

    expect(components).toEqual({
      destination: { 'es-prod': { registrants: ['node-a'] } },
      processor: {},
    });
  });

  it('adds a second registrant to the same component', () => {
    let components = registerComponent(EMPTY, processor('shout'), 'slot-a');
    components = registerComponent(components, processor('shout'), 'slot-b');

    expect(components.processor.shout.registrants).toEqual(['slot-a', 'slot-b']);
  });

  it('is idempotent: the same registrant twice is one registrant', () => {
    let components = registerComponent(EMPTY, destination('es-prod'), 'node-a');
    const before = components.destination['es-prod'];
    components = registerComponent(components, destination('es-prod'), 'node-a');

    expect(components.destination['es-prod'].registrants).toEqual(['node-a']);
    expect(components.destination['es-prod']).toBe(before);
  });

  it('keeps the value of a component that registers again', () => {
    let components = registerComponent(EMPTY, destination('es-prod'), 'node-a');
    components = withDestinationEntry(components, 'es-prod', READY_ENTRY);
    components = registerComponent(components, destination('es-prod'), 'node-b');

    expect(components.destination['es-prod'].entry).toBe(READY_ENTRY);
  });

  it('keeps a destination and a processor with the same id apart', () => {
    let components = registerComponent(EMPTY, destination('shared'), 'node-a');
    components = registerComponent(components, processor('shared'), 'slot-a');

    expect(components.destination.shared.registrants).toEqual(['node-a']);
    expect(components.processor.shared.registrants).toEqual(['slot-a']);
  });
});

describe('unregisterComponent', () => {
  it('keeps the interest of a registrant that stays', () => {
    let components = registerComponent(EMPTY, processor('shout'), 'slot-a');
    components = registerComponent(components, processor('shout'), 'slot-b');
    components = unregisterComponent(components, processor('shout'), 'slot-a');

    expect(components.processor.shout.registrants).toEqual(['slot-b']);
    expect(isRegistered(components, processor('shout'))).toBe(true);
  });

  it('is idempotent: unregistering twice does not remove another registrant', () => {
    let components = registerComponent(EMPTY, processor('shout'), 'slot-a');
    components = registerComponent(components, processor('shout'), 'slot-b');
    components = unregisterComponent(components, processor('shout'), 'slot-a');
    components = unregisterComponent(components, processor('shout'), 'slot-a');

    expect(components.processor.shout.registrants).toEqual(['slot-b']);
  });

  it('ignores a registrant that was never registered', () => {
    const registered = registerComponent(EMPTY, destination('es-prod'), 'node-a');
    const components = unregisterComponent(registered, destination('es-prod'), 'other');

    expect(components.destination['es-prod'].registrants).toEqual(['node-a']);
  });

  it('does not create a component that was never registered', () => {
    expect(unregisterComponent(EMPTY, destination('es-prod'), 'node-a')).toEqual(EMPTY);
  });

  it('removes a component that nobody shows and that has no value', () => {
    let components = registerComponent(EMPTY, destination('es-prod'), 'node-a');
    components = unregisterComponent(components, destination('es-prod'), 'node-a');

    expect(components).toEqual(EMPTY);
  });

  it('removes a component that only has a request in flight', () => {
    let components = registerComponent(EMPTY, destination('es-prod'), 'node-a');
    components = withDestinationEntry(components, 'es-prod', { status: 'loading' });
    components = unregisterComponent(components, destination('es-prod'), 'node-a');

    expect(components).toEqual(EMPTY);
  });

  it('keeps the value of a component that nobody shows any more', () => {
    let components = registerComponent(EMPTY, destination('es-prod'), 'node-a');
    components = withDestinationEntry(components, 'es-prod', READY_ENTRY);
    components = unregisterComponent(components, destination('es-prod'), 'node-a');

    expect(components.destination['es-prod']).toEqual({
      registrants: [],
      entry: READY_ENTRY,
      fetchedAt: 1,
    });
    expect(isRegistered(components, destination('es-prod'))).toBe(false);
  });

  it('removes only the component that became empty', () => {
    let components = registerComponent(EMPTY, destination('es-prod'), 'node-a');
    components = registerComponent(components, processor('shout'), 'slot-a');
    components = unregisterComponent(components, destination('es-prod'), 'node-a');

    expect(components.destination).toEqual({});
    expect(components.processor.shout.registrants).toEqual(['slot-a']);
  });
});

describe('isRegistered and hasRegistrants', () => {
  it('is false for a component that does not exist', () => {
    expect(isRegistered(EMPTY, destination('es-prod'))).toBe(false);

    const components = registerComponent(EMPTY, destination('es-prod'), 'node-a');
    expect(isRegistered(components, destination('other'))).toBe(false);
    expect(isRegistered(components, processor('es-prod'))).toBe(false);
  });

  it('is true while a registrant shows the component', () => {
    const components = registerComponent(EMPTY, destination('es-prod'), 'node-a');

    expect(isRegistered(components, destination('es-prod'))).toBe(true);
    expect(hasRegistrants(components.destination['es-prod'])).toBe(true);
    expect(hasRegistrants({ registrants: [] })).toBe(false);
  });
});
