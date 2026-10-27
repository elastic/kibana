/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { STATS_FIXTURE_RESPONSES } from '../../../services/unit_stats_client/fixture_unit_stats_client';
import type { StatsFixtureScenario } from '../../../services/unit_stats_client/fixture_unit_stats_client';
import { mapStatsResponse } from '../../../services/unit_stats_client/map_stats_response';
import type { StatsWindow } from '../../../services/unit_stats_client/types';
import { STATS_REQUEST_FAILED_ERROR_CODE } from './constants';
import {
  dropRemovedComponents,
  markBatchFailed,
  markBatchLoading,
  mergeFetchedStats,
} from './stats_entries';
import { getWindowKey, registerComponent, unregisterComponent } from './stats_registration';
import type { StatsBatch, StatsWindows } from './types';

const DEFAULT_WINDOW: StatsWindow = { kind: 'default' };
const RANGE_WINDOW: StatsWindow = {
  kind: 'range',
  start: '2026-10-27T12:00:00.000Z',
  end: '2026-10-27T12:15:00.000Z',
};

const destination = (id: string): StreamsUnit.StatsComponentRef => ({ kind: 'destination', id });
const processor = (id: string): StreamsUnit.StatsComponentRef => ({ kind: 'processor', id });

const COMPONENTS = [destination('es-prod'), processor('uppercase-message')];

const batchOf = (
  components: StreamsUnit.StatsComponentRef[],
  window: StatsWindow = DEFAULT_WINDOW
): StatsBatch => ({ windowKey: getWindowKey(window), window, components });

const registerAll = (
  refs: StreamsUnit.StatsComponentRef[],
  window: StatsWindow = DEFAULT_WINDOW,
  windows: StatsWindows = {}
): StatsWindows =>
  refs.reduce(
    (current, ref) => registerComponent(current, ref, window, `registrant-${ref.kind}-${ref.id}`),
    windows
  );

const responseFor = (scenario: StatsFixtureScenario, components: StreamsUnit.StatsComponentRef[]) =>
  mapStatsResponse(STATS_FIXTURE_RESPONSES[scenario], components);

const MERGED_AT = 1_000;

describe('markBatchLoading', () => {
  it('marks a component without a value as loading', () => {
    const windows = markBatchLoading(registerAll(COMPONENTS), batchOf(COMPONENTS));

    expect(windows.default.destination['es-prod'].entry).toEqual({ status: 'loading' });
    expect(windows.default.processor['uppercase-message'].entry).toEqual({ status: 'loading' });
  });

  it('keeps the value of a component while its refresh runs', () => {
    const fetched = mergeFetchedStats(
      registerAll(COMPONENTS),
      batchOf(COMPONENTS),
      responseFor('data', COMPONENTS),
      MERGED_AT
    );
    const windows = markBatchLoading(fetched, batchOf(COMPONENTS));

    expect(windows.default.destination['es-prod'].entry).toBe(
      fetched.default.destination['es-prod'].entry
    );
  });

  it('marks a component error as loading, because the request retries it', () => {
    const components = [destination('es-dev')];
    const failed = mergeFetchedStats(
      registerAll(components),
      batchOf(components),
      responseFor('partial', components),
      MERGED_AT
    );
    expect(failed.default.destination['es-dev'].entry?.status).toBe('error');

    const windows = markBatchLoading(failed, batchOf(components));

    expect(windows.default.destination['es-dev'].entry).toEqual({ status: 'loading' });
  });

  it('marks only the window of the batch', () => {
    const registered = registerAll(COMPONENTS, RANGE_WINDOW, registerAll(COMPONENTS));
    const windows = markBatchLoading(registered, batchOf(COMPONENTS, RANGE_WINDOW));

    expect(windows[getWindowKey(RANGE_WINDOW)].destination['es-prod'].entry?.status).toBe(
      'loading'
    );
    expect(windows.default.destination['es-prod'].entry).toBeUndefined();
  });

  it('does not create a component that was unregistered before the request started', () => {
    const windows = markBatchLoading(registerAll([processor('shout')]), batchOf(COMPONENTS));

    expect(windows.default.destination['es-prod']).toBeUndefined();
  });

  it('returns the same windows when the window of the batch is gone', () => {
    const windows = registerAll(COMPONENTS);

    expect(markBatchLoading(windows, batchOf(COMPONENTS, RANGE_WINDOW))).toBe(windows);
  });
});

describe('mergeFetchedStats', () => {
  it('writes the result of every component and stamps when it arrived', () => {
    const windows = mergeFetchedStats(
      registerAll(COMPONENTS),
      batchOf(COMPONENTS),
      responseFor('data', COMPONENTS),
      MERGED_AT
    );

    expect(windows.default.destination['es-prod']).toMatchObject({
      entry: { status: 'ready', stats: { eventsRate: 3700 } },
      fetchedAt: MERGED_AT,
    });
    expect(windows.default.processor['uppercase-message'].entry).toMatchObject({
      status: 'ready',
      stats: { instances: expect.arrayContaining([expect.objectContaining({ routeIndex: null })]) },
    });
    expect(windows.default.destination['es-prod'].entry).not.toHaveProperty('error');
  });

  it('keeps who shows a component', () => {
    const windows = mergeFetchedStats(
      registerAll(COMPONENTS),
      batchOf(COMPONENTS),
      responseFor('data', COMPONENTS),
      MERGED_AT
    );

    expect(windows.default.destination['es-prod'].registrants).toEqual([
      'registrant-destination-es-prod',
    ]);
  });

  it('keeps the same entry object when a refresh returns equal values', () => {
    const first = mergeFetchedStats(
      registerAll(COMPONENTS),
      batchOf(COMPONENTS),
      responseFor('data', COMPONENTS),
      MERGED_AT
    );
    const second = mergeFetchedStats(
      first,
      batchOf(COMPONENTS),
      responseFor('data', COMPONENTS),
      MERGED_AT + 30_000
    );

    expect(second.default.destination['es-prod'].entry).toBe(
      first.default.destination['es-prod'].entry
    );
    expect(second.default.processor['uppercase-message'].entry).toBe(
      first.default.processor['uppercase-message'].entry
    );
    expect(second.default.destination['es-prod'].fetchedAt).toBe(MERGED_AT + 30_000);
  });

  it('replaces the entry when the values change', () => {
    const first = mergeFetchedStats(
      registerAll(COMPONENTS),
      batchOf(COMPONENTS),
      responseFor('data', COMPONENTS),
      MERGED_AT
    );
    const second = mergeFetchedStats(
      first,
      batchOf(COMPONENTS),
      responseFor('noData', COMPONENTS),
      MERGED_AT + 30_000
    );

    expect(second.default.destination['es-prod'].entry).not.toBe(
      first.default.destination['es-prod'].entry
    );
    expect(second.default.destination['es-prod'].entry?.status).toBe('noData');
    expect(second.default.processor['uppercase-message'].entry).toMatchObject({
      status: 'noData',
      stats: { instances: [] },
    });
  });

  it('keeps data next to a component error', () => {
    const components = [destination('es-prod'), destination('es-dev')];
    const windows = mergeFetchedStats(
      registerAll(components),
      batchOf(components),
      responseFor('partial', components),
      MERGED_AT
    );

    expect(windows.default.destination['es-prod'].entry?.status).toBe('ready');
    expect(windows.default.destination['es-dev'].entry).toMatchObject({
      status: 'error',
      error: { code: 'error' },
    });
  });

  it('recovers a stale value and replaces a loading placeholder', () => {
    const loading = markBatchLoading(registerAll(COMPONENTS), batchOf(COMPONENTS));
    const fetched = mergeFetchedStats(
      loading,
      batchOf(COMPONENTS),
      responseFor('data', COMPONENTS),
      MERGED_AT
    );
    const stale = markBatchFailed(fetched, batchOf(COMPONENTS), 'Service Unavailable');
    const recovered = mergeFetchedStats(
      stale,
      batchOf(COMPONENTS),
      responseFor('data', COMPONENTS),
      MERGED_AT + 30_000
    );

    expect(fetched.default.destination['es-prod'].entry?.status).toBe('ready');
    expect(stale.default.destination['es-prod'].entry?.status).toBe('stale');
    expect(recovered.default.destination['es-prod'].entry?.status).toBe('ready');
  });

  it('does not touch a component that is not in the batch, or another window', () => {
    const registered = registerAll(COMPONENTS, RANGE_WINDOW, registerAll(COMPONENTS));
    const windows = mergeFetchedStats(
      registered,
      batchOf([destination('es-prod')]),
      responseFor('data', [destination('es-prod')]),
      MERGED_AT
    );

    expect(windows.default.destination['es-prod'].entry?.status).toBe('ready');
    expect(windows.default.processor['uppercase-message'].entry).toBeUndefined();
    expect(windows[getWindowKey(RANGE_WINDOW)].destination['es-prod'].entry).toBeUndefined();
  });

  it('caches the result of a component that was unregistered while the request ran', () => {
    const windows = mergeFetchedStats(
      registerAll([processor('uppercase-message')]),
      batchOf(COMPONENTS),
      responseFor('data', COMPONENTS),
      MERGED_AT
    );

    expect(windows.default.destination['es-prod']).toMatchObject({
      registrants: [],
      entry: { status: 'ready' },
    });
  });

  it('returns the same windows when the window of the batch is gone', () => {
    const windows = registerAll(COMPONENTS);

    expect(
      mergeFetchedStats(
        windows,
        batchOf(COMPONENTS, RANGE_WINDOW),
        responseFor('data', COMPONENTS),
        MERGED_AT
      )
    ).toBe(windows);
  });
});

describe('markBatchFailed', () => {
  const REASON = 'Service Unavailable';

  const fetchedWindows = (scenario: StatsFixtureScenario = 'data') =>
    mergeFetchedStats(
      registerAll(COMPONENTS),
      batchOf(COMPONENTS),
      responseFor(scenario, COMPONENTS),
      MERGED_AT
    );

  it('shows an error for a component that has no value', () => {
    const windows = markBatchFailed(registerAll(COMPONENTS), batchOf(COMPONENTS), REASON);

    expect(windows.default.destination['es-prod'].entry).toEqual({
      status: 'error',
      error: { code: STATS_REQUEST_FAILED_ERROR_CODE, reason: REASON },
    });
    expect(windows.default.processor['uppercase-message'].entry?.status).toBe('error');
  });

  it('shows an error for a component that was loading', () => {
    const loading = markBatchLoading(registerAll(COMPONENTS), batchOf(COMPONENTS));
    const windows = markBatchFailed(loading, batchOf(COMPONENTS), REASON);

    expect(windows.default.destination['es-prod'].entry?.status).toBe('error');
  });

  it('marks a value stale and keeps it', () => {
    const fetched = fetchedWindows();
    const windows = markBatchFailed(fetched, batchOf(COMPONENTS), REASON);

    expect(windows.default.destination['es-prod'].entry).toEqual({
      ...fetched.default.destination['es-prod'].entry,
      status: 'stale',
    });
    expect(windows.default.destination['es-prod'].entry?.stats).toEqual(
      fetched.default.destination['es-prod'].entry?.stats
    );
  });

  it('marks a no data result stale too', () => {
    const windows = markBatchFailed(fetchedWindows('noData'), batchOf(COMPONENTS), REASON);

    expect(windows.default.destination['es-prod'].entry?.status).toBe('stale');
  });

  it('leaves a stale value as it is', () => {
    const stale = markBatchFailed(fetchedWindows(), batchOf(COMPONENTS), REASON);
    const again = markBatchFailed(stale, batchOf(COMPONENTS), REASON);

    expect(again.default.destination['es-prod'].entry).toBe(
      stale.default.destination['es-prod'].entry
    );
  });

  it('leaves a component error as it is, because it is a better reason', () => {
    const components = [destination('es-dev')];
    const fetched = mergeFetchedStats(
      registerAll(components),
      batchOf(components),
      responseFor('partial', components),
      MERGED_AT
    );
    const windows = markBatchFailed(fetched, batchOf(components), REASON);

    expect(windows.default.destination['es-dev'].entry).toBe(
      fetched.default.destination['es-dev'].entry
    );
  });

  it('does not change when the value was fetched, so the next flush requests it again', () => {
    const windows = markBatchFailed(fetchedWindows(), batchOf(COMPONENTS), REASON);

    expect(windows.default.destination['es-prod'].fetchedAt).toBe(MERGED_AT);
  });

  it('returns the same windows when the window of the batch is gone', () => {
    const windows = registerAll(COMPONENTS);

    expect(markBatchFailed(windows, batchOf(COMPONENTS, RANGE_WINDOW), REASON)).toBe(windows);
  });
});

describe('dropRemovedComponents', () => {
  const fetchedWindows = () =>
    mergeFetchedStats(
      registerAll(COMPONENTS),
      batchOf(COMPONENTS),
      responseFor('data', COMPONENTS),
      MERGED_AT
    );

  it('keeps the components that are still in the unit, with their values', () => {
    const fetched = fetchedWindows();
    const windows = dropRemovedComponents(fetched, new Set(['es-prod', 'uppercase-message']));

    expect(windows.default.destination['es-prod']).toBe(fetched.default.destination['es-prod']);
    expect(windows.default.processor['uppercase-message']).toBe(
      fetched.default.processor['uppercase-message']
    );
  });

  it('drops a component that is no longer in the unit, with its value and its registrants', () => {
    const windows = dropRemovedComponents(fetchedWindows(), new Set(['uppercase-message']));

    expect(windows.default.destination['es-prod']).toBeUndefined();
    expect(windows.default.processor['uppercase-message']).toBeDefined();
  });

  it('drops a processor that is no longer in the unit', () => {
    const windows = dropRemovedComponents(fetchedWindows(), new Set(['es-prod']));

    expect(windows.default.processor['uppercase-message']).toBeUndefined();
    expect(windows.default.destination['es-prod']).toBeDefined();
  });

  it('removes a window that is left with nothing', () => {
    expect(dropRemovedComponents(fetchedWindows(), new Set())).toEqual({});
  });

  it('does not touch processor values when the routes of the unit change', () => {
    const fetched = fetchedWindows();
    const windows = dropRemovedComponents(fetched, new Set(['es-prod', 'uppercase-message']));

    expect(windows.default.processor['uppercase-message'].entry).toBe(
      fetched.default.processor['uppercase-message'].entry
    );
  });

  it('ignores a later unregister of a component that was dropped', () => {
    const dropped = dropRemovedComponents(fetchedWindows(), new Set(['uppercase-message']));
    const windows = unregisterComponent(
      dropped,
      destination('es-prod'),
      DEFAULT_WINDOW,
      'registrant-destination-es-prod'
    );

    expect(windows.default.destination['es-prod']).toBeUndefined();
  });
});
