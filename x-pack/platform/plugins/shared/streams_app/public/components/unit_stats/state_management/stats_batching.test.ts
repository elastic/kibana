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
import { getWindowKey, registerComponent, unregisterComponent } from './stats_registration';
import type { StatsEntry, StatsWindows } from './types';

const DEFAULT_WINDOW: StatsWindow = { kind: 'default' };
const RANGE_WINDOW: StatsWindow = {
  kind: 'range',
  start: '2026-10-27T12:00:00.000Z',
  end: '2026-10-27T12:15:00.000Z',
};

const FRESHNESS_MS = 30_000;
const NOW = 100_000;
const DUE_OPTIONS: DueOptions = { now: NOW, freshnessMs: FRESHNESS_MS, force: false };

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

const registerAll = (
  refs: StreamsUnit.StatsComponentRef[],
  window: StatsWindow = DEFAULT_WINDOW,
  windows: StatsWindows = {}
): StatsWindows =>
  refs.reduce(
    (current, ref) => registerComponent(current, ref, window, `registrant-${ref.kind}-${ref.id}`),
    windows
  );

/** Sets the value state of a destination that is already registered in the default window. */
const withDestinationValue = (
  windows: StatsWindows,
  id: string,
  entry: StatsEntry<DestinationStatsView>,
  fetchedAt?: number
): StatsWindows => ({
  ...windows,
  default: {
    ...windows.default,
    destination: {
      ...windows.default.destination,
      [id]: { ...windows.default.destination[id], entry, fetchedAt },
    },
  },
});

describe('planBatches', () => {
  it('plans nothing when nothing is registered', () => {
    expect(planBatches({}, DUE_OPTIONS)).toEqual([]);
  });

  it('requests a registered component that has no value', () => {
    const windows = registerAll([destination('es-prod')]);

    expect(planBatches(windows, DUE_OPTIONS)).toEqual([
      { windowKey: 'default', window: DEFAULT_WINDOW, components: [destination('es-prod')] },
    ]);
  });

  it('puts destinations and processors of a window in the same batch', () => {
    const windows = registerAll([processor('shout'), destination('es-prod')]);

    expect(planBatches(windows, DUE_OPTIONS)).toEqual([
      {
        windowKey: 'default',
        window: DEFAULT_WINDOW,
        components: [destination('es-prod'), processor('shout')],
      },
    ]);
  });

  it('requests a processor shown by two registrants once', () => {
    let windows = registerComponent({}, processor('shout'), DEFAULT_WINDOW, 'slot-a');
    windows = registerComponent(windows, processor('shout'), DEFAULT_WINDOW, 'slot-b');

    expect(planBatches(windows, DUE_OPTIONS)[0].components).toEqual([processor('shout')]);
  });

  it('does not request a component that nobody shows any more, even when its value is old', () => {
    let windows = registerAll([destination('es-prod')]);
    windows = withDestinationValue(windows, 'es-prod', READY_ENTRY, 0);
    windows = unregisterComponent(
      windows,
      destination('es-prod'),
      DEFAULT_WINDOW,
      'registrant-destination-es-prod'
    );

    expect(planBatches(windows, DUE_OPTIONS)).toEqual([]);
  });

  describe('freshness', () => {
    it('does not request a fresh value', () => {
      const windows = withDestinationValue(
        registerAll([destination('es-prod')]),
        'es-prod',
        READY_ENTRY,
        NOW - FRESHNESS_MS + 1
      );

      expect(planBatches(windows, DUE_OPTIONS)).toEqual([]);
    });

    it('requests a value that is as old as the freshness period', () => {
      const windows = withDestinationValue(
        registerAll([destination('es-prod')]),
        'es-prod',
        READY_ENTRY,
        NOW - FRESHNESS_MS
      );

      expect(planBatches(windows, DUE_OPTIONS)).toHaveLength(1);
    });

    it('requests a fresh value when forced', () => {
      const windows = withDestinationValue(
        registerAll([destination('es-prod')]),
        'es-prod',
        READY_ENTRY,
        NOW
      );

      expect(planBatches(windows, { ...DUE_OPTIONS, force: true })).toHaveLength(1);
    });

    it('requests a component whose request is in flight, so a new batch replaces that request', () => {
      const windows = withDestinationValue(registerAll([destination('es-prod')]), 'es-prod', {
        status: 'loading',
      });

      expect(planBatches(windows, DUE_OPTIONS)).toHaveLength(1);
    });

    it('does not request a fresh component error again before it expires', () => {
      const windows = withDestinationValue(
        registerAll([destination('es-prod')]),
        'es-prod',
        { status: 'error', error: { code: 'unavailable', reason: 'Elasticsearch is unavailable' } },
        NOW
      );

      expect(planBatches(windows, DUE_OPTIONS)).toEqual([]);
    });
  });

  describe('windows and the request limit', () => {
    it('plans one batch per window, and never mixes windows', () => {
      let windows = registerAll([destination('es-prod')], DEFAULT_WINDOW);
      windows = registerAll([destination('es-prod'), processor('shout')], RANGE_WINDOW, windows);

      expect(planBatches(windows, DUE_OPTIONS)).toEqual([
        { windowKey: 'default', window: DEFAULT_WINDOW, components: [destination('es-prod')] },
        {
          windowKey: getWindowKey(RANGE_WINDOW),
          window: RANGE_WINDOW,
          components: [destination('es-prod'), processor('shout')],
        },
      ]);
    });

    it('splits 250 components of a window into batches of at most 100', () => {
      const refs = Array.from({ length: 250 }, (_, index) => destination(`destination-${index}`));
      const batches = planBatches(registerAll(refs), DUE_OPTIONS);

      expect(batches.map(({ components }) => components.length)).toEqual([100, 100, 50]);
      expect(batches.every(({ windowKey }) => windowKey === 'default')).toBe(true);
      expect(Math.max(...batches.map(({ components }) => components.length))).toBe(
        MAX_STREAMS_UNIT_STATS_COMPONENTS
      );
    });

    it('counts destinations and processors together against the limit', () => {
      const refs = [
        ...Array.from({ length: 150 }, (_, index) => destination(`destination-${index}`)),
        ...Array.from({ length: 150 }, (_, index) => processor(`processor-${index}`)),
      ];

      expect(
        planBatches(registerAll(refs), DUE_OPTIONS).map(({ components }) => components.length)
      ).toEqual([100, 100, 100]);
    });

    it('requests every component once across the chunks', () => {
      const refs = Array.from({ length: 250 }, (_, index) => destination(`destination-${index}`));
      const requested = planBatches(registerAll(refs), DUE_OPTIONS).flatMap(
        ({ components }) => components
      );

      expect(requested).toEqual(refs);
    });
  });
});

describe('isBatchWanted', () => {
  const batch = {
    windowKey: 'default',
    components: [destination('es-prod'), processor('shout')],
  };

  it('is wanted while any component of the request is shown', () => {
    expect(isBatchWanted(registerAll([processor('shout')]), batch)).toBe(true);
  });

  it('is wanted when only some of its components are still shown', () => {
    let windows = registerAll([destination('es-prod'), processor('shout')]);
    windows = unregisterComponent(
      windows,
      destination('es-prod'),
      DEFAULT_WINDOW,
      'registrant-destination-es-prod'
    );

    expect(isBatchWanted(windows, batch)).toBe(true);
  });

  it('is not wanted once none of its components is shown', () => {
    let windows = registerAll([destination('es-prod'), processor('shout')]);
    windows = unregisterComponent(
      windows,
      destination('es-prod'),
      DEFAULT_WINDOW,
      'registrant-destination-es-prod'
    );
    windows = unregisterComponent(
      windows,
      processor('shout'),
      DEFAULT_WINDOW,
      'registrant-processor-shout'
    );

    expect(isBatchWanted(windows, batch)).toBe(false);
  });

  it('is not wanted when the window is gone', () => {
    expect(isBatchWanted({}, batch)).toBe(false);
  });

  it('looks only at its own window', () => {
    const windows = registerAll([destination('es-prod')], RANGE_WINDOW);

    expect(isBatchWanted(windows, batch)).toBe(false);
  });
});
