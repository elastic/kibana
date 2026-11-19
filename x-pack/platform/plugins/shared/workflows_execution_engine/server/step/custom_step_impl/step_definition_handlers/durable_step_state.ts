/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Persisted under step execution `state` for durable poll-step engine bookkeeping. */
export const DURABLE_STEP_STATE_KEY = '__durableStepState';

export interface DurableStepState {
  /** Author state JSON persisted between polls (opaque to the engine). */
  customState?: Record<string, unknown>;
  startCalled?: boolean;
  pollState?: {
    attempt: number;
    nextPollAt: string;
  };
}
