/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { guardedMapStep } from '../stream_utils';
import {
  alertEventStatus,
  type AlertEventDocument,
} from '../../../resources/datastreams/alert_events';
import type { LatestAlertEventState } from '../../director/queries';

const NO_PREVIOUS_STATE: ReadonlyMap<string, LatestAlertEventState> = new Map();

/**
 * A `no_data` event is worth persisting only when it changes something.
 *
 * The executor re-synthesizes a `no_data` event for every active group that is
 * absent from the breach set and has no data, on every run. The first one after
 * a `breached`/`recovered` event is the group's transition into no-data and is
 * always written: it is the marker a `LAST(alert.status)` reader recovers the
 * held status from. Every later one resolves — through the strategy
 * (`keep_last`) or the user `activate` lock — to the same episode id, status and
 * status_count already persisted, so it carries no lifecycle information and
 * would only keep the stream growing for as long as the group stays absent.
 *
 * Only `no_data` is ever redundant. `breached` and `recovered` are the engine's
 * liveness signal and are always written, which is also what makes a group that
 * resumes reporting resume event writing with no extra logic. Comparing the
 * director's *output* (rather than skipping synthesis upstream) keeps a
 * mid-absence policy change effective: `keep_last` → `resolve` resolves to
 * `inactive`, differs, and is written.
 */
export const isRedundantNoDataEvent = (
  alertEvent: AlertEventDocument,
  previousAlertEvent: LatestAlertEventState | undefined
): boolean => {
  if (alertEvent.status !== alertEventStatus.no_data || !previousAlertEvent) {
    return false;
  }

  if (previousAlertEvent.last_status !== alertEventStatus.no_data) {
    return false;
  }

  const { alert } = alertEvent;
  if (!alert) {
    return false;
  }

  return (
    alert.id === previousAlertEvent.last_episode_id &&
    alert.status === previousAlertEvent.last_episode_status &&
    (alert.status_count ?? null) === (previousAlertEvent.last_episode_status_count ?? null)
  );
};

/**
 * Write-policy step: drops director-enriched `no_data` events that carry no
 * lifecycle change for a group already held in no-data, so a held group writes
 * a single transition marker instead of one identical event per run.
 *
 * Runs after `DirectorStep`, which stays a pure 1:1 state function and threads
 * the prior state it loaded onto `state.previousAlertStateByGroupHash`. When no
 * prior state was threaded the batch passes through unchanged.
 *
 * This relies on `ClassifyAbsentGroupsStep` being an end-of-stream classifier:
 * `no_data` events are emitted only in its single final batch, after the
 * full-run breach set is known. Two guarantees follow. A `no_data` group had no
 * event written earlier in the same run (it is in the final batch precisely
 * because it was absent from the breach set), so the prior state the director
 * loads for it is the previous run's last event — the correct baseline. And the
 * streamed breach batches carry only `breached` events, which this step never
 * touches, so streaming is unaffected. The comparison is purely per event
 * against persisted state and needs no cross-batch knowledge, which is why it
 * belongs downstream of the classifier rather than inside it.
 */
@injectable()
export class SuppressRedundantNoDataEventsStep implements RuleExecutionStep {
  public readonly name = 'suppress_redundant_no_data_events';

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return guardedMapStep(streamState, ['alertEventsBatch'], (state) => {
      const previousAlertStateByGroupHash =
        state.previousAlertStateByGroupHash ?? NO_PREVIOUS_STATE;

      const alertEventsBatch = state.alertEventsBatch.filter(
        (alertEvent) =>
          !isRedundantNoDataEvent(
            alertEvent,
            previousAlertStateByGroupHash.get(alertEvent.group_hash)
          )
      );

      const droppedCount = state.alertEventsBatch.length - alertEventsBatch.length;
      if (droppedCount > 0) {
        state.logger.withLabels({ step: this.name }).debug({
          message: `Dropped ${droppedCount} redundant no_data alert event(s) for held groups`,
        });
      }

      return { type: 'continue', state: { ...state, alertEventsBatch } };
    });
  }
}
