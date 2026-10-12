/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The two codes an alert action is rejected with when the write it was asked
 * for would not change the alert. They live beside the response schemas,
 * rather than only in the server's error catalog, because clients have to
 * recognize them: in bulk they arrive as per-item entries in `errors[]`,
 * where they mean "left untouched", not "failed".
 */

/** `activate` / `deactivate` / `ack` / `unack` of an alert already in that state. */
export const INVALID_ALERT_STATE_TRANSITION_CODE = 'INVALID_ALERT_STATE_TRANSITION';

/** `assign` to the current assignee, or `tag` with the current set. */
export const ALERT_ACTION_NO_OP_CODE = 'ALERT_ACTION_NO_OP';

export const ALERT_ACTION_NO_OP_CODES = [
  INVALID_ALERT_STATE_TRANSITION_CODE,
  ALERT_ACTION_NO_OP_CODE,
] as const;

export type AlertActionNoOpCode = (typeof ALERT_ACTION_NO_OP_CODES)[number];

/** Whether an error code means the alert was left untouched because it already satisfied the request. */
export const isAlertActionNoOpCode = (code: string): code is AlertActionNoOpCode =>
  ALERT_ACTION_NO_OP_CODES.some((noOpCode) => noOpCode === code);
