/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { MAX_STREAMS_UNIT_STATS_COMPONENTS } from '@kbn/streams-schema';
import type { DestinationStatsView, StatsWindow } from '../../../services/unit_stats_client/types';
import { isBatchWanted, planBatches } from './stats_batching';
import type { DueOptions } from './stats_batching';
import { registerComponent, unregisterComponent } from './stats_registration';
import type { StatsComponents, StatsEntry } from './types';

const WINDOW: StatsWindow = {
  kind: 'range',
  start: '2026-10-27T12:00:00.000Z',
  end: '2026-10-27T12:15:00.000Z',
};

const EMPTY: StatsComponents = { destination: {}, processor: {} };

const FRESHNESS_MS = 30_000;
const NOW = 100_000;
const DUE_OPTIONS: DueOptions = { now: NOW, freshnessMs: FRESHNESS_MS, force: false };

const plan = (components: StatsComponents, options: DueOptions = DUE_OPTIONS) =>
  planBatches(components, WINDOW, options);

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

const registerAll = (refs: StreamsUnit.StatsComponentRef[]): StatsComponents =>
  refs.reduce(
    (current, ref) => registerComponent(current, ref, `registrant-${ref.kind}-${ref.id}`),
    EMPTY
  );

/** Sets the value state of a destination that is already registered. */
const withDestinationValue = (
  components: StatsComponents,
  id: string,
  entry: StatsEntry<DestinationStatsView>,
  fetchedAt?: number
): StatsComponents => ({
  ...components,
  destination: {
    ...components.destination,
    [id]: { ...components.destination[id], entry, fetchedAt },
  },
});

describe('planBatches', () => {
  it('plans nothing when nothing is registered', () => {
    expect(plan(EMPTY)).toEqual([]);
  });

  it('requests a registered component that has no value', () => {
    expect(plan(registerAll([destination('es-prod')]))).toEqual([
      { window: WINDOW, components: [destination('es-prod')] },
    ]);
  });

  it('puts destinations and processors in the same batch', () => {
    expect(plan(registerAll([processor('shout'), destination('es-prod')]))).toEqual([
      { window: WINDOW, components: [destination('es-prod'), processor('shout')] },
    ]);
  });

  it('requests a processor shown by two registrants once', () => {
    let components = registerComponent(EMPTY, processor('shout'), 'slot-a');
    components = registerComponent(components, processor('shout'), 'slot-b');

    expect(plan(components)[0].components).toEqual([processor('shout')]);
  });

  it('does not request a component that nobody shows any more, even when its value is old', () => {
    let components = registerAll([destination('es-prod')]);
    components = withDestinationValue(components, 'es-prod', READY_ENTRY, 0);
    components = unregisterComponent(
      components,
      destination('es-prod'),
      'registrant-destination-es-prod'
    );

    expect(plan(components)).toEqual([]);
  });

  describe('freshness', () => {
    it('does not request a fresh value', () => {
      const components = withDestinationValue(
        registerAll([destination('es-prod')]),
        'es-prod',
        READY_ENTRY,
        NOW - FRESHNESS_MS + 1
      );

      expect(plan(components)).toEqual([]);
    });

    it('requests a value that is as old as the freshness period', () => {
      const components = withDestinationValue(
        registerAll([destination('es-prod')]),
        'es-prod',
        READY_ENTRY,
        NOW - FRESHNESS_MS
      );

      expect(plan(components)).toHaveLength(1);
    });

    it('requests a fresh value when forced', () => {
      const components = withDestinationValue(
        registerAll([destination('es-prod')]),
        'es-prod',
        READY_ENTRY,
        NOW
      );

      expect(plan(components, { ...DUE_OPTIONS, force: true })).toHaveLength(1);
    });

    it('does not request a component whose request is in flight, so the request can finish', () => {
      const components = withDestinationValue(registerAll([destination('es-prod')]), 'es-prod', {
        status: 'loading',
      });

      expect(plan(components)).toEqual([]);
    });

    it('requests only the components that the request in flight does not cover', () => {
      const components = withDestinationValue(
        registerAll([destination('es-prod'), processor('shout')]),
        'es-prod',
        { status: 'loading' }
      );

      expect(plan(components)[0].components).toEqual([processor('shout')]);
    });

    it('requests a component whose request is in flight when forced, because a forced flush replaces it', () => {
      const components = withDestinationValue(registerAll([destination('es-prod')]), 'es-prod', {
        status: 'loading',
      });

      expect(plan(components, { ...DUE_OPTIONS, force: true })).toHaveLength(1);
    });

    it('does not request a fresh component error again before it expires', () => {
      const components = withDestinationValue(
        registerAll([destination('es-prod')]),
        'es-prod',
        { status: 'error', error: { code: 'unavailable', reason: 'Elasticsearch is unavailable' } },
        NOW
      );

      expect(plan(components)).toEqual([]);
    });
  });

  describe('the window and the request limit', () => {
    it('gives every batch the window the caller resolved', () => {
      const refs = Array.from({ length: 250 }, (_, index) => destination(`destination-${index}`));
      const batches = plan(registerAll(refs));

      expect(batches).toHaveLength(3);
      expect(batches.every(({ window }) => window === WINDOW)).toBe(true);
    });

    it('uses the window of each call, so every flush can resolve it again', () => {
      const components = registerAll([destination('es-prod')]);
      const slid: StatsWindow = {
        kind: 'range',
        start: '2026-10-27T12:00:30.000Z',
        end: '2026-10-27T12:15:30.000Z',
      };

      expect(planBatches(components, WINDOW, DUE_OPTIONS)[0].window).toBe(WINDOW);
      expect(planBatches(components, slid, DUE_OPTIONS)[0].window).toBe(slid);
    });

    it('splits 250 components into batches of at most 100', () => {
      const refs = Array.from({ length: 250 }, (_, index) => destination(`destination-${index}`));
      const batches = plan(registerAll(refs));

      expect(batches.map(({ components }) => components.length)).toEqual([100, 100, 50]);
      expect(Math.max(...batches.map(({ components }) => components.length))).toBe(
        MAX_STREAMS_UNIT_STATS_COMPONENTS
      );
    });

    it('counts destinations and processors together against the limit', () => {
      const refs = [
        ...Array.from({ length: 150 }, (_, index) => destination(`destination-${index}`)),
        ...Array.from({ length: 150 }, (_, index) => processor(`processor-${index}`)),
      ];

      expect(plan(registerAll(refs)).map(({ components }) => components.length)).toEqual([
        100, 100, 100,
      ]);
    });

    it('requests every component once across the chunks', () => {
      const refs = Array.from({ length: 250 }, (_, index) => destination(`destination-${index}`));
      const requested = plan(registerAll(refs)).flatMap(({ components }) => components);

      expect(requested).toEqual(refs);
    });
  });
});

describe('isBatchWanted', () => {
  const batch = { components: [destination('es-prod'), processor('shout')] };

  it('is wanted while any component of the request is shown', () => {
    expect(isBatchWanted(registerAll([processor('shout')]), batch)).toBe(true);
  });

  it('is wanted when only some of its components are still shown', () => {
    let components = registerAll([destination('es-prod'), processor('shout')]);
    components = unregisterComponent(
      components,
      destination('es-prod'),
      'registrant-destination-es-prod'
    );

    expect(isBatchWanted(components, batch)).toBe(true);
  });

  it('is not wanted once none of its components is shown', () => {
    let components = registerAll([destination('es-prod'), processor('shout')]);
    components = unregisterComponent(
      components,
      destination('es-prod'),
      'registrant-destination-es-prod'
    );
    components = unregisterComponent(components, processor('shout'), 'registrant-processor-shout');

    expect(isBatchWanted(components, batch)).toBe(false);
  });

  it('is not wanted when nothing is registered', () => {
    expect(isBatchWanted(EMPTY, batch)).toBe(false);
  });

  it('is not wanted when only other components are shown', () => {
    expect(isBatchWanted(registerAll([destination('other')]), batch)).toBe(false);
  });
});
