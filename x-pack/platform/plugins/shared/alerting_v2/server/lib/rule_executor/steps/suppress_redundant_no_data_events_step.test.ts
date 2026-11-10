/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SuppressRedundantNoDataEventsStep,
  isRedundantNoDataEvent,
} from './suppress_redundant_no_data_events_step';
import {
  collectStreamResults,
  createPipelineStream,
  createRulePipelineState,
  createAlertEvent,
} from '../test_utils';
import { alertEpisodeStatus } from '../../../resources/datastreams/alert_events';
import type { LatestAlertEventState } from '../../director/queries';

// Persisted state of a group already held in no-data: the last event was the
// `no_data` transition marker and the episode is held `active`.
const heldState = (overrides: Partial<LatestAlertEventState> = {}): LatestAlertEventState => ({
  last_status: 'no_data',
  last_episode_id: 'held-episode',
  last_episode_status: alertEpisodeStatus.active,
  last_episode_status_count: null,
  last_episode_timestamp: '2026-01-01T00:00:00.000Z',
  last_episode_phase_started_at: null,
  last_lifecycle_action_type: null,
  group_hash: 'hash-1',
  ...overrides,
});

// A director-enriched `no_data` event whose episode is held `active` with no
// status_count — the shape both a `keep_last` hold and a user `activate` lock
// produce.
const heldNoDataEvent = (groupHash = 'hash-1') =>
  createAlertEvent({
    group_hash: groupHash,
    status: 'no_data',
    alert: { id: 'held-episode', status: alertEpisodeStatus.active },
  });

describe('isRedundantNoDataEvent', () => {
  it('keeps the transition marker when the previous event was not no_data', () => {
    expect(isRedundantNoDataEvent(heldNoDataEvent(), heldState({ last_status: 'breached' }))).toBe(
      false
    );
  });

  it('drops a no_data continuation when the previous event was no_data and nothing changed', () => {
    expect(isRedundantNoDataEvent(heldNoDataEvent(), heldState())).toBe(true);
  });

  it('never drops a breached event, even when the lifecycle state is unchanged', () => {
    const breached = createAlertEvent({
      group_hash: 'hash-1',
      status: 'breached',
      alert: { id: 'held-episode', status: alertEpisodeStatus.active },
    });

    expect(isRedundantNoDataEvent(breached, heldState({ last_status: 'breached' }))).toBe(false);
  });

  it('never drops a recovered event', () => {
    const recovered = createAlertEvent({
      group_hash: 'hash-1',
      status: 'recovered',
      alert: { id: 'held-episode', status: alertEpisodeStatus.recovering },
    });

    expect(isRedundantNoDataEvent(recovered, heldState())).toBe(false);
  });

  it('keeps the no_data event when the resolved episode status differs (policy switched to resolve)', () => {
    const resolved = createAlertEvent({
      group_hash: 'hash-1',
      status: 'no_data',
      alert: { id: 'held-episode', status: alertEpisodeStatus.inactive },
    });

    expect(isRedundantNoDataEvent(resolved, heldState())).toBe(false);
  });

  it('keeps the no_data event when the resolved status_count differs from the persisted one', () => {
    const event = createAlertEvent({
      group_hash: 'hash-1',
      status: 'no_data',
      alert: { id: 'held-episode', status: alertEpisodeStatus.pending },
    });

    expect(
      isRedundantNoDataEvent(
        event,
        heldState({ last_episode_status: alertEpisodeStatus.pending, last_episode_status_count: 2 })
      )
    ).toBe(false);
  });

  it('keeps the no_data event when the episode id differs', () => {
    expect(isRedundantNoDataEvent(heldNoDataEvent(), heldState({ last_episode_id: 'other' }))).toBe(
      false
    );
  });

  it('keeps a no_data event with no persisted state', () => {
    expect(isRedundantNoDataEvent(heldNoDataEvent(), undefined)).toBe(false);
  });

  it('keeps a no_data event the director did not enrich', () => {
    const unenriched = createAlertEvent({
      group_hash: 'hash-1',
      status: 'no_data',
      alert: undefined,
    });

    expect(isRedundantNoDataEvent(unenriched, heldState())).toBe(false);
  });
});

describe('SuppressRedundantNoDataEventsStep', () => {
  const step = new SuppressRedundantNoDataEventsStep();

  const run = async (
    alertEventsBatch: ReturnType<typeof createAlertEvent>[],
    previousAlertStateByGroupHash?: ReadonlyMap<string, LatestAlertEventState>
  ) => {
    const state = createRulePipelineState({ alertEventsBatch, previousAlertStateByGroupHash });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));
    return result;
  };

  it('drops a held no_data continuation and keeps everything else in a mixed batch', async () => {
    const breached = createAlertEvent({
      group_hash: 'hash-2',
      status: 'breached',
      alert: { id: 'episode-2', status: alertEpisodeStatus.active },
    });

    const result = await run(
      [heldNoDataEvent('hash-1'), breached],
      new Map([
        ['hash-1', heldState()],
        [
          'hash-2',
          heldState({
            group_hash: 'hash-2',
            last_status: 'breached',
            last_episode_id: 'episode-2',
          }),
        ],
      ])
    );

    expect(result.type).toBe('continue');
    expect(result.state.alertEventsBatch).toEqual([breached]);
  });

  it('writes nothing across repeated executions while a group stays held', async () => {
    // The persisted state never advances while the group is held, so every
    // subsequent run sees the same marker and must drop its event.
    const previous = new Map([['hash-1', heldState()]]);

    for (let execution = 0; execution < 5; execution++) {
      const result = await run([heldNoDataEvent()], previous);

      expect(result.state.alertEventsBatch).toEqual([]);
    }
  });

  it('keeps the transition marker for a group entering no_data', async () => {
    const marker = heldNoDataEvent();

    const result = await run(
      [marker],
      new Map([['hash-1', heldState({ last_status: 'breached' })]])
    );

    expect(result.state.alertEventsBatch).toEqual([marker]);
  });

  it('passes the batch through unchanged when no prior state was threaded', async () => {
    const events = [heldNoDataEvent()];

    const result = await run(events, undefined);

    expect(result.state.alertEventsBatch).toEqual(events);
  });

  it('passes an empty batch through', async () => {
    const result = await run([], new Map([['hash-1', heldState()]]));

    expect(result.type).toBe('continue');
    expect(result.state.alertEventsBatch).toEqual([]);
  });

  it('preserves the rest of the pipeline state', async () => {
    const state = createRulePipelineState({
      alertEventsBatch: [heldNoDataEvent()],
      previousAlertStateByGroupHash: new Map([['hash-1', heldState()]]),
      newEpisodeIds: ['kept-id'],
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.state).toEqual({ ...state, alertEventsBatch: [] });
  });

  it('halts with state_not_ready when the batch is missing', async () => {
    const state = createRulePipelineState({ alertEventsBatch: undefined });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });
});
