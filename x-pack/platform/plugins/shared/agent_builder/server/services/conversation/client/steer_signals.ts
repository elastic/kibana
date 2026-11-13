/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserMessageEvent } from '@kbn/agent-builder-common';

export type SteerRefusalKind =
  | 'not_steerable'
  | 'awaiting_prompt'
  | 'no_active_execution'
  | 'too_many_pending';

/** Exits the OCC mutation without treating a steer refusal or duplicate as a version conflict. */
export type SteerSignalOutcome =
  | { kind: 'already_stored'; event: UserMessageEvent }
  | { kind: SteerRefusalKind };

export class SteerSignal {
  constructor(public readonly outcome: SteerSignalOutcome) {}
}
