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
  clearValues,
  dropRemovedComponents,
  markBatchFailed,
  markBatchLoading,
  mergeFetchedStats,
} from './stats_entries';
import { registerComponent, unregisterComponent } from './stats_registration';
import type { StatsBatch, StatsComponents } from './types';

// The entries functions do not read the window. A batch just carries it.
const WINDOW: StatsWindow = { kind: 'default' };

const EMPTY: StatsComponents = { destination: {}, processor: {} };

const destination = (id: string): StreamsUnit.StatsComponentRef => ({ kind: 'destination', id });
const processor = (id: string): StreamsUnit.StatsComponentRef => ({ kind: 'processor', id });

const REFS = [destination('es-prod'), processor('uppercase-message')];

const batchOf = (refs: StreamsUnit.StatsComponentRef[]): StatsBatch => ({
  window: WINDOW,
  components: refs,
});

const registerAll = (refs: StreamsUnit.StatsComponentRef[]): StatsComponents =>
  refs.reduce(
    (current, ref) => registerComponent(current, ref, `registrant-${ref.kind}-${ref.id}`),
    EMPTY
  );

const responseFor = (scenario: StatsFixtureScenario, refs: StreamsUnit.StatsComponentRef[]) =>
  mapStatsResponse(STATS_FIXTURE_RESPONSES[scenario], refs);

const MERGED_AT = 1_000;

describe('markBatchLoading', () => {
  it('marks a component without a value as loading', () => {
    const components = markBatchLoading(registerAll(REFS), batchOf(REFS));

    expect(components.destination['es-prod'].entry).toEqual({ status: 'loading' });
    expect(components.processor['uppercase-message'].entry).toEqual({ status: 'loading' });
  });

  it('keeps the value of a component while its refresh runs', () => {
    const fetched = mergeFetchedStats(
      registerAll(REFS),
      batchOf(REFS),
      responseFor('data', REFS),
      MERGED_AT
    );
    const components = markBatchLoading(fetched, batchOf(REFS));

    expect(components.destination['es-prod'].entry).toBe(fetched.destination['es-prod'].entry);
  });

  it('marks a component error as loading, because the request retries it', () => {
    const refs = [destination('es-dev')];
    const failed = mergeFetchedStats(
      registerAll(refs),
      batchOf(refs),
      responseFor('partial', refs),
      MERGED_AT
    );
    expect(failed.destination['es-dev'].entry?.status).toBe('error');

    const components = markBatchLoading(failed, batchOf(refs));

    expect(components.destination['es-dev'].entry).toEqual({ status: 'loading' });
  });

  it('marks only the components of the batch', () => {
    const components = markBatchLoading(registerAll(REFS), batchOf([destination('es-prod')]));

    expect(components.destination['es-prod'].entry).toEqual({ status: 'loading' });
    expect(components.processor['uppercase-message'].entry).toBeUndefined();
  });

  it('does not create a component that was unregistered before the request started', () => {
    const components = markBatchLoading(registerAll([processor('shout')]), batchOf(REFS));

    expect(components.destination['es-prod']).toBeUndefined();
  });
});

describe('mergeFetchedStats', () => {
  it('writes the result of every component and stamps when it arrived', () => {
    const components = mergeFetchedStats(
      registerAll(REFS),
      batchOf(REFS),
      responseFor('data', REFS),
      MERGED_AT
    );

    expect(components.destination['es-prod']).toMatchObject({
      entry: { status: 'ready', stats: { eventsRate: 3700 } },
      fetchedAt: MERGED_AT,
    });
    expect(components.processor['uppercase-message'].entry).toMatchObject({
      status: 'ready',
      stats: { instances: expect.arrayContaining([expect.objectContaining({ routeIndex: null })]) },
    });
    expect(components.destination['es-prod'].entry).not.toHaveProperty('error');
  });

  it('keeps who shows a component', () => {
    const components = mergeFetchedStats(
      registerAll(REFS),
      batchOf(REFS),
      responseFor('data', REFS),
      MERGED_AT
    );

    expect(components.destination['es-prod'].registrants).toEqual([
      'registrant-destination-es-prod',
    ]);
  });

  it('keeps the same entry object when a refresh returns equal values', () => {
    const first = mergeFetchedStats(
      registerAll(REFS),
      batchOf(REFS),
      responseFor('data', REFS),
      MERGED_AT
    );
    const second = mergeFetchedStats(
      first,
      batchOf(REFS),
      responseFor('data', REFS),
      MERGED_AT + 30_000
    );

    expect(second.destination['es-prod'].entry).toBe(first.destination['es-prod'].entry);
    expect(second.processor['uppercase-message'].entry).toBe(
      first.processor['uppercase-message'].entry
    );
    expect(second.destination['es-prod'].fetchedAt).toBe(MERGED_AT + 30_000);
  });

  it('replaces the entry when the values change', () => {
    const first = mergeFetchedStats(
      registerAll(REFS),
      batchOf(REFS),
      responseFor('data', REFS),
      MERGED_AT
    );
    const second = mergeFetchedStats(
      first,
      batchOf(REFS),
      responseFor('noData', REFS),
      MERGED_AT + 30_000
    );

    expect(second.destination['es-prod'].entry).not.toBe(first.destination['es-prod'].entry);
    expect(second.destination['es-prod'].entry?.status).toBe('noData');
    expect(second.processor['uppercase-message'].entry).toMatchObject({
      status: 'noData',
      stats: { instances: [] },
    });
  });

  it('keeps data next to a component error', () => {
    const refs = [destination('es-prod'), destination('es-dev')];
    const components = mergeFetchedStats(
      registerAll(refs),
      batchOf(refs),
      responseFor('partial', refs),
      MERGED_AT
    );

    expect(components.destination['es-prod'].entry?.status).toBe('ready');
    expect(components.destination['es-dev'].entry).toMatchObject({
      status: 'error',
      error: { code: 'error' },
    });
  });

  it('recovers a stale value and replaces a loading placeholder', () => {
    const loading = markBatchLoading(registerAll(REFS), batchOf(REFS));
    const fetched = mergeFetchedStats(loading, batchOf(REFS), responseFor('data', REFS), MERGED_AT);
    const stale = markBatchFailed(fetched, batchOf(REFS), 'Service Unavailable');
    const recovered = mergeFetchedStats(
      stale,
      batchOf(REFS),
      responseFor('data', REFS),
      MERGED_AT + 30_000
    );

    expect(fetched.destination['es-prod'].entry?.status).toBe('ready');
    expect(stale.destination['es-prod'].entry?.status).toBe('stale');
    expect(recovered.destination['es-prod'].entry?.status).toBe('ready');
  });

  it('does not touch a component that is not in the batch', () => {
    const components = mergeFetchedStats(
      registerAll(REFS),
      batchOf([destination('es-prod')]),
      responseFor('data', [destination('es-prod')]),
      MERGED_AT
    );

    expect(components.destination['es-prod'].entry?.status).toBe('ready');
    expect(components.processor['uppercase-message'].entry).toBeUndefined();
  });

  it('caches the result of a component that was unregistered while the request ran', () => {
    const components = mergeFetchedStats(
      registerAll([processor('uppercase-message')]),
      batchOf(REFS),
      responseFor('data', REFS),
      MERGED_AT
    );

    expect(components.destination['es-prod']).toMatchObject({
      registrants: [],
      entry: { status: 'ready' },
    });
  });
});

describe('markBatchFailed', () => {
  const REASON = 'Service Unavailable';

  const fetchedComponents = (scenario: StatsFixtureScenario = 'data') =>
    mergeFetchedStats(registerAll(REFS), batchOf(REFS), responseFor(scenario, REFS), MERGED_AT);

  it('shows an error for a component that has no value', () => {
    const components = markBatchFailed(registerAll(REFS), batchOf(REFS), REASON);

    expect(components.destination['es-prod'].entry).toEqual({
      status: 'error',
      error: { code: STATS_REQUEST_FAILED_ERROR_CODE, reason: REASON },
    });
    expect(components.processor['uppercase-message'].entry?.status).toBe('error');
  });

  it('shows an error for a component that was loading', () => {
    const loading = markBatchLoading(registerAll(REFS), batchOf(REFS));
    const components = markBatchFailed(loading, batchOf(REFS), REASON);

    expect(components.destination['es-prod'].entry?.status).toBe('error');
  });

  it('marks a value stale and keeps it', () => {
    const fetched = fetchedComponents();
    const components = markBatchFailed(fetched, batchOf(REFS), REASON);

    expect(components.destination['es-prod'].entry).toEqual({
      ...fetched.destination['es-prod'].entry,
      status: 'stale',
    });
    expect(components.destination['es-prod'].entry?.stats).toEqual(
      fetched.destination['es-prod'].entry?.stats
    );
  });

  it('marks a no data result stale too', () => {
    const components = markBatchFailed(fetchedComponents('noData'), batchOf(REFS), REASON);

    expect(components.destination['es-prod'].entry?.status).toBe('stale');
  });

  it('leaves a stale value as it is', () => {
    const stale = markBatchFailed(fetchedComponents(), batchOf(REFS), REASON);
    const again = markBatchFailed(stale, batchOf(REFS), REASON);

    expect(again.destination['es-prod'].entry).toBe(stale.destination['es-prod'].entry);
  });

  it('leaves a component error as it is, because it is a better reason', () => {
    const refs = [destination('es-dev')];
    const fetched = mergeFetchedStats(
      registerAll(refs),
      batchOf(refs),
      responseFor('partial', refs),
      MERGED_AT
    );
    const components = markBatchFailed(fetched, batchOf(refs), REASON);

    expect(components.destination['es-dev'].entry).toBe(fetched.destination['es-dev'].entry);
  });

  it('does not change when the value was fetched, so the next flush requests it again', () => {
    const components = markBatchFailed(fetchedComponents(), batchOf(REFS), REASON);

    expect(components.destination['es-prod'].fetchedAt).toBe(MERGED_AT);
  });

  it('does not touch a component that is not in the batch', () => {
    const components = markBatchFailed(
      registerAll(REFS),
      batchOf([destination('es-prod')]),
      REASON
    );

    expect(components.destination['es-prod'].entry?.status).toBe('error');
    expect(components.processor['uppercase-message'].entry).toBeUndefined();
  });
});

describe('dropRemovedComponents', () => {
  const fetchedComponents = () =>
    mergeFetchedStats(registerAll(REFS), batchOf(REFS), responseFor('data', REFS), MERGED_AT);

  it('keeps the components that are still in the unit, with their values', () => {
    const fetched = fetchedComponents();
    const components = dropRemovedComponents(fetched, new Set(['es-prod', 'uppercase-message']));

    expect(components.destination['es-prod']).toBe(fetched.destination['es-prod']);
    expect(components.processor['uppercase-message']).toBe(fetched.processor['uppercase-message']);
  });

  it('drops a component that is no longer in the unit, with its value and its registrants', () => {
    const components = dropRemovedComponents(fetchedComponents(), new Set(['uppercase-message']));

    expect(components.destination['es-prod']).toBeUndefined();
    expect(components.processor['uppercase-message']).toBeDefined();
  });

  it('drops a processor that is no longer in the unit', () => {
    const components = dropRemovedComponents(fetchedComponents(), new Set(['es-prod']));

    expect(components.processor['uppercase-message']).toBeUndefined();
    expect(components.destination['es-prod']).toBeDefined();
  });

  it('leaves nothing when no component is in the unit any more', () => {
    expect(dropRemovedComponents(fetchedComponents(), new Set())).toEqual(EMPTY);
  });

  it('does not touch processor values when the routes of the unit change', () => {
    const fetched = fetchedComponents();
    const components = dropRemovedComponents(fetched, new Set(['es-prod', 'uppercase-message']));

    expect(components.processor['uppercase-message'].entry).toBe(
      fetched.processor['uppercase-message'].entry
    );
  });

  it('ignores a later unregister of a component that was dropped', () => {
    const dropped = dropRemovedComponents(fetchedComponents(), new Set(['uppercase-message']));
    const components = unregisterComponent(
      dropped,
      destination('es-prod'),
      'registrant-destination-es-prod'
    );

    expect(components.destination['es-prod']).toBeUndefined();
  });
});

describe('clearValues', () => {
  const fetchedComponents = () =>
    mergeFetchedStats(registerAll(REFS), batchOf(REFS), responseFor('data', REFS), MERGED_AT);

  it('drops the value and when it was fetched, and keeps who shows the component', () => {
    const components = clearValues(fetchedComponents());

    expect(components.destination['es-prod']).toEqual({
      registrants: ['registrant-destination-es-prod'],
    });
    expect(components.processor['uppercase-message']).toEqual({
      registrants: ['registrant-processor-uppercase-message'],
    });
  });

  it('drops a loading placeholder and an error of a component that is shown', () => {
    const refs = [destination('es-prod'), destination('es-dev')];
    const loading = markBatchLoading(registerAll(refs), batchOf(refs));
    const failed = markBatchFailed(loading, batchOf([destination('es-dev')]), 'unavailable');
    expect(failed.destination['es-prod'].entry?.status).toBe('loading');
    expect(failed.destination['es-dev'].entry?.status).toBe('error');

    const components = clearValues(failed);

    expect(components.destination['es-prod'].entry).toBeUndefined();
    expect(components.destination['es-dev'].entry).toBeUndefined();
  });

  it('drops a cached value that nobody shows, with the component', () => {
    const unshown = unregisterComponent(
      fetchedComponents(),
      destination('es-prod'),
      'registrant-destination-es-prod'
    );
    expect(unshown.destination['es-prod'].entry?.status).toBe('ready');

    const components = clearValues(unshown);

    expect(components.destination['es-prod']).toBeUndefined();
    expect(components.processor['uppercase-message']).toBeDefined();
  });

  it('leaves a shown component that has no value as it is', () => {
    const registered = registerAll(REFS);

    expect(clearValues(registered)).toEqual(registered);
  });

  it('leaves nothing when nothing is registered', () => {
    expect(clearValues(EMPTY)).toEqual(EMPTY);
  });
});
