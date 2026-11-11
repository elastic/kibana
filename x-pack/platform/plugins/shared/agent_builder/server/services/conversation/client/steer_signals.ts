/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown from `appendSteer`'s OCC `fields` callback, on the `ConversationBusySignal` pattern: each
 * refusal becomes a 409/429 that `OccWriter` would otherwise retry as a version conflict.
 * `already_stored` is a short-circuit success, not a refusal: the write is skipped.
 */
export type SteerSignalKind =
  | 'not_steerable'
  | 'awaiting_prompt'
  | 'no_active_execution'
  | 'too_many_pending'
  | 'already_stored';

export class SteerSignal {
  constructor(
    public readonly kind: SteerSignalKind,
    public readonly meta: { alreadyStored?: boolean; createdAt?: string } = {}
  ) {}
}
