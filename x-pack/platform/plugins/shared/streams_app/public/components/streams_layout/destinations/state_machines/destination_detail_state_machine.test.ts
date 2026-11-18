/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActor, fromPromise, waitFor } from 'xstate';
import type { ResolvedDestinationIndex } from '@kbn/streams-plugin/common';
import type { DestinationIndexStats } from '../destination_index_stats';
import {
  destinationDetailStateMachine,
  selectIndexStatsStatus,
  type LoadIndexStatsInput,
} from './destination_detail_state_machine';

const indices: ResolvedDestinationIndex[] = [
  {
    name: 'logs-a-default',
    is_data_stream: true,
    lifecycle: { dsl: { data_retention: '7d' } },
    failure_store_enabled: false,
    privileges: { read_failure_store: true },
  },
  { name: 'legacy-index', is_data_stream: false },
];

const timeRange = { start: 0, end: 1000 };

const createDetailActor = (initialIndices?: ResolvedDestinationIndex[]) => {
  const loadIndexStats = jest.fn(
    async ({
      input,
    }: {
      input: LoadIndexStatsInput;
      signal: AbortSignal;
    }): Promise<DestinationIndexStats> => ({
      timeRange: input.timeRange,
      docs: Object.fromEntries(input.dataStreamNames.map((name) => [name, 1])),
      degradedDocs: {},
      failedDocs: {},
      ingestedDocs: {},
      storageBytes: {},
    })
  );
  const actor = createActor(
    destinationDetailStateMachine.provide({
      actors: { loadIndexStats: fromPromise(loadIndexStats) },
    }),
    { input: { destinationId: 'es-logs', indices: initialIndices } }
  ).start();
  return { actor, loadIndexStats };
};

const waitForStatus = (
  actor: ReturnType<typeof createDetailActor>['actor'],
  status: 'ready' | 'failed'
) => waitFor(actor, (snapshot) => selectIndexStatsStatus(snapshot) === status);

describe('destination detail state machine', () => {
  it('loads stats for its data streams only, and reuses them for the same time range', async () => {
    const { actor, loadIndexStats } = createDetailActor(indices);

    actor.send({ type: 'indexStats.request', timeRange });
    await waitForStatus(actor, 'ready');
    actor.send({ type: 'indexStats.request', timeRange });

    expect(loadIndexStats).toHaveBeenCalledTimes(1);
    expect(loadIndexStats.mock.calls[0][0].input.dataStreamNames).toEqual(['logs-a-default']);
    expect(actor.getSnapshot().context.indexStats?.docs).toEqual({ 'logs-a-default': 1 });
  });

  it('reloads when the time range changes', async () => {
    const { actor, loadIndexStats } = createDetailActor(indices);

    actor.send({ type: 'indexStats.request', timeRange });
    await waitForStatus(actor, 'ready');
    actor.send({ type: 'indexStats.request', timeRange: { start: 0, end: 2000 } });
    await waitForStatus(actor, 'ready');

    expect(loadIndexStats).toHaveBeenCalledTimes(2);
  });

  it('waits for indices before loading, and reloads with the last time range when they change', async () => {
    const { actor, loadIndexStats } = createDetailActor();

    actor.send({ type: 'indexStats.request', timeRange });
    expect(selectIndexStatsStatus(actor.getSnapshot())).toBe('loading');
    expect(loadIndexStats).not.toHaveBeenCalled();

    actor.send({ type: 'indices.update', indices });
    await waitForStatus(actor, 'ready');

    actor.send({ type: 'indices.reset' });
    expect(actor.getSnapshot().context.indexStats).toBeUndefined();
    actor.send({ type: 'indices.update', indices: [] });
    await waitForStatus(actor, 'ready');

    expect(loadIndexStats).toHaveBeenCalledTimes(2);
    expect(loadIndexStats.mock.calls[1][0].input).toMatchObject({ dataStreamNames: [], timeRange });
  });

  it('does not load until stats are requested', () => {
    const { actor, loadIndexStats } = createDetailActor();

    actor.send({ type: 'indices.update', indices });

    expect(loadIndexStats).not.toHaveBeenCalled();
  });

  it('retries a failed request for the same time range', async () => {
    const { actor, loadIndexStats } = createDetailActor(indices);
    loadIndexStats.mockRejectedValueOnce(new Error('boom'));

    actor.send({ type: 'indexStats.request', timeRange });
    await waitForStatus(actor, 'failed');
    actor.send({ type: 'indexStats.request', timeRange });
    await waitForStatus(actor, 'ready');

    expect(loadIndexStats).toHaveBeenCalledTimes(2);
  });

  it('retries a partial stats result for the same time range', async () => {
    const { actor, loadIndexStats } = createDetailActor(indices);
    loadIndexStats.mockResolvedValueOnce({
      timeRange,
      docs: {},
      degradedDocs: {},
      failedDocs: {},
      ingestedDocs: {},
      storageBytes: undefined,
    });

    actor.send({ type: 'indexStats.request', timeRange });
    await waitForStatus(actor, 'ready');
    actor.send({ type: 'indexStats.request', timeRange });
    await waitForStatus(actor, 'ready');

    expect(loadIndexStats).toHaveBeenCalledTimes(2);
  });

  it('reloads on a refresh of the same time range', async () => {
    const { actor, loadIndexStats } = createDetailActor(indices);

    actor.send({ type: 'indexStats.request', timeRange });
    await waitForStatus(actor, 'ready');
    actor.send({ type: 'indexStats.request', timeRange, refresh: true });
    await waitForStatus(actor, 'ready');

    expect(loadIndexStats).toHaveBeenCalledTimes(2);
  });

  it('restarts a running load on a refresh of the same time range', async () => {
    const { actor, loadIndexStats } = createDetailActor(indices);

    actor.send({ type: 'indexStats.request', timeRange });
    actor.send({ type: 'indexStats.request', timeRange, refresh: true });
    await waitForStatus(actor, 'ready');

    expect(loadIndexStats).toHaveBeenCalledTimes(2);
    expect(loadIndexStats.mock.calls[0][0].signal.aborted).toBe(true);
  });

  it('keeps the running load when the same time range is requested again', async () => {
    const { actor, loadIndexStats } = createDetailActor(indices);

    actor.send({ type: 'indexStats.request', timeRange });
    actor.send({ type: 'indexStats.request', timeRange });
    await waitForStatus(actor, 'ready');

    expect(loadIndexStats).toHaveBeenCalledTimes(1);
  });
});
