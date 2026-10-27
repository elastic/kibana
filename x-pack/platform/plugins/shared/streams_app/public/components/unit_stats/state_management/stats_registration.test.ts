/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type { DestinationStatsView, StatsWindow } from '../../../services/unit_stats_client/types';
import {
  getWindowKey,
  hasRegistrants,
  isRegistered,
  registerComponent,
  unregisterComponent,
} from './stats_registration';
import type { StatsEntry, StatsWindows } from './types';

const DEFAULT_WINDOW: StatsWindow = { kind: 'default' };
const RANGE_WINDOW: StatsWindow = {
  kind: 'range',
  start: '2026-10-27T12:00:00.000Z',
  end: '2026-10-27T12:15:00.000Z',
};

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

/** Sets a value on a destination that is already in the default window. */
const withDestinationEntry = (
  windows: StatsWindows,
  id: string,
  entry: StatsEntry<DestinationStatsView>
): StatsWindows => ({
  ...windows,
  default: {
    ...windows.default,
    destination: {
      ...windows.default.destination,
      [id]: { ...windows.default.destination[id], entry, fetchedAt: 1 },
    },
  },
});

describe('getWindowKey', () => {
  it('uses one key for the default window and one per range', () => {
    expect(getWindowKey(DEFAULT_WINDOW)).toBe('default');
    expect(getWindowKey(RANGE_WINDOW)).toBe('2026-10-27T12:00:00.000Z/2026-10-27T12:15:00.000Z');
  });
});

describe('registerComponent', () => {
  it('creates the window with the component and its registrant', () => {
    const windows = registerComponent({}, destination('es-prod'), DEFAULT_WINDOW, 'node-a');

    expect(windows).toEqual({
      default: {
        window: DEFAULT_WINDOW,
        destination: { 'es-prod': { registrants: ['node-a'] } },
        processor: {},
      },
    });
  });

  it('adds a second registrant to the same component', () => {
    let windows = registerComponent({}, processor('shout'), DEFAULT_WINDOW, 'slot-a');
    windows = registerComponent(windows, processor('shout'), DEFAULT_WINDOW, 'slot-b');

    expect(windows.default.processor.shout.registrants).toEqual(['slot-a', 'slot-b']);
  });

  it('is idempotent: the same registrant twice is one registrant', () => {
    let windows = registerComponent({}, destination('es-prod'), DEFAULT_WINDOW, 'node-a');
    const before = windows.default.destination['es-prod'];
    windows = registerComponent(windows, destination('es-prod'), DEFAULT_WINDOW, 'node-a');

    expect(windows.default.destination['es-prod'].registrants).toEqual(['node-a']);
    expect(windows.default.destination['es-prod']).toBe(before);
  });

  it('keeps the value of a component that registers again', () => {
    let windows = registerComponent({}, destination('es-prod'), DEFAULT_WINDOW, 'node-a');
    windows = withDestinationEntry(windows, 'es-prod', READY_ENTRY);
    windows = registerComponent(windows, destination('es-prod'), DEFAULT_WINDOW, 'node-b');

    expect(windows.default.destination['es-prod'].entry).toBe(READY_ENTRY);
  });

  it('keeps a destination and a processor with the same id apart', () => {
    let windows = registerComponent({}, destination('shared'), DEFAULT_WINDOW, 'node-a');
    windows = registerComponent(windows, processor('shared'), DEFAULT_WINDOW, 'slot-a');

    expect(windows.default.destination.shared.registrants).toEqual(['node-a']);
    expect(windows.default.processor.shared.registrants).toEqual(['slot-a']);
  });

  it('keeps windows apart', () => {
    let windows = registerComponent({}, destination('es-prod'), DEFAULT_WINDOW, 'node-a');
    windows = registerComponent(windows, destination('es-prod'), RANGE_WINDOW, 'row-a');

    expect(Object.keys(windows)).toEqual(['default', getWindowKey(RANGE_WINDOW)]);
    expect(windows[getWindowKey(RANGE_WINDOW)].window).toEqual(RANGE_WINDOW);
    expect(windows.default.destination['es-prod'].registrants).toEqual(['node-a']);
  });
});

describe('unregisterComponent', () => {
  it('keeps the interest of a registrant that stays', () => {
    let windows = registerComponent({}, processor('shout'), DEFAULT_WINDOW, 'slot-a');
    windows = registerComponent(windows, processor('shout'), DEFAULT_WINDOW, 'slot-b');
    windows = unregisterComponent(windows, processor('shout'), DEFAULT_WINDOW, 'slot-a');

    expect(windows.default.processor.shout.registrants).toEqual(['slot-b']);
    expect(isRegistered(windows.default, processor('shout'))).toBe(true);
  });

  it('is idempotent: unregistering twice does not remove another registrant', () => {
    let windows = registerComponent({}, processor('shout'), DEFAULT_WINDOW, 'slot-a');
    windows = registerComponent(windows, processor('shout'), DEFAULT_WINDOW, 'slot-b');
    windows = unregisterComponent(windows, processor('shout'), DEFAULT_WINDOW, 'slot-a');
    windows = unregisterComponent(windows, processor('shout'), DEFAULT_WINDOW, 'slot-a');

    expect(windows.default.processor.shout.registrants).toEqual(['slot-b']);
  });

  it('ignores a registrant that was never registered', () => {
    const registered = registerComponent({}, destination('es-prod'), DEFAULT_WINDOW, 'node-a');
    const windows = unregisterComponent(
      registered,
      destination('es-prod'),
      DEFAULT_WINDOW,
      'other'
    );

    expect(windows.default.destination['es-prod'].registrants).toEqual(['node-a']);
  });

  it('returns the same windows when the window does not exist', () => {
    const windows: StatsWindows = {};

    expect(unregisterComponent(windows, destination('es-prod'), DEFAULT_WINDOW, 'node-a')).toBe(
      windows
    );
  });

  it('removes a component that nobody shows and that has no value, and the window with it', () => {
    let windows = registerComponent({}, destination('es-prod'), DEFAULT_WINDOW, 'node-a');
    windows = unregisterComponent(windows, destination('es-prod'), DEFAULT_WINDOW, 'node-a');

    expect(windows).toEqual({});
  });

  it('removes a component that only has a request in flight', () => {
    let windows = registerComponent({}, destination('es-prod'), DEFAULT_WINDOW, 'node-a');
    windows = withDestinationEntry(windows, 'es-prod', { status: 'loading' });
    windows = unregisterComponent(windows, destination('es-prod'), DEFAULT_WINDOW, 'node-a');

    expect(windows).toEqual({});
  });

  it('keeps the value of a component that nobody shows any more', () => {
    let windows = registerComponent({}, destination('es-prod'), DEFAULT_WINDOW, 'node-a');
    windows = withDestinationEntry(windows, 'es-prod', READY_ENTRY);
    windows = unregisterComponent(windows, destination('es-prod'), DEFAULT_WINDOW, 'node-a');

    expect(windows.default.destination['es-prod']).toEqual({
      registrants: [],
      entry: READY_ENTRY,
      fetchedAt: 1,
    });
    expect(isRegistered(windows.default, destination('es-prod'))).toBe(false);
  });

  it('removes only the window that became empty', () => {
    let windows = registerComponent({}, destination('es-prod'), DEFAULT_WINDOW, 'node-a');
    windows = registerComponent(windows, destination('es-prod'), RANGE_WINDOW, 'row-a');
    windows = unregisterComponent(windows, destination('es-prod'), RANGE_WINDOW, 'row-a');

    expect(Object.keys(windows)).toEqual(['default']);
  });
});

describe('isRegistered and hasRegistrants', () => {
  it('is false for a window or a component that does not exist', () => {
    expect(isRegistered(undefined, destination('es-prod'))).toBe(false);

    const windows = registerComponent({}, destination('es-prod'), DEFAULT_WINDOW, 'node-a');
    expect(isRegistered(windows.default, destination('other'))).toBe(false);
    expect(isRegistered(windows.default, processor('es-prod'))).toBe(false);
  });

  it('is true while a registrant shows the component', () => {
    const windows = registerComponent({}, destination('es-prod'), DEFAULT_WINDOW, 'node-a');

    expect(isRegistered(windows.default, destination('es-prod'))).toBe(true);
    expect(hasRegistrants(windows.default.destination['es-prod'])).toBe(true);
    expect(hasRegistrants({ registrants: [] })).toBe(false);
  });
});
