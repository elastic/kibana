/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbortReason } from '@kbn/kibana-utils-plugin/common';

/**
 * Coordinates the lifetime of requests started for a single ML embeddable load.
 *
 * Wire `signal` into the request APIs that embeddable's data fetching code calls.
 * Calling `cancel` before `startLoad` keeps the current signal aborted, so callers
 * that check `signal.aborted` before starting a request skip it.
 */
export class RequestCancellationManager {
  private abortController = new AbortController();
  private hasStartedLoad = false;

  public get signal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Marks the start of a new load. If a load was already in progress, its requests are
   * aborted with `AbortReason.REPLACED` and a fresh signal is handed out for the new load.
   */
  public startLoad(): void {
    if (this.hasStartedLoad) {
      this.abortController.abort(AbortReason.REPLACED);
      this.abortController = new AbortController();
    }
    this.hasStartedLoad = true;
  }

  /**
   * Call after a user-initiated cancellation to allow automatic refreshes (e.g. the
   * dashboard's auto-refresh interval) to resume issuing requests again, without waiting
   * for an explicit `startLoad` call from the embeddable's own fetch pipeline.
   */
  public resumeAfterCancellation(): void {
    if (this.abortController.signal.aborted) {
      this.abortController = new AbortController();
      this.hasStartedLoad = true;
    }
  }

  /**
   * Cancels all in-flight requests for the current load. If called before the next
   * `startLoad`, it also prevents that load's requests from starting.
   */
  public cancel(reason: AbortReason = AbortReason.CANCELED): void {
    this.abortController.abort(reason);
  }
}
