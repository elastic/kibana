/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Control-flow signal for the GitHub OAuth Device Flow poll loop. GitHub returns
 * `authorization_pending` / `slow_down` as `error` codes on the token endpoint
 * while a device authorization is in progress; we model them as a single typed
 * error with a discriminant so the poll loop can react (keep waiting / back off)
 * without string-matching, and without tripping one-class-per-file lint.
 */

export type DeviceFlowSignalCode = 'authorization_pending' | 'slow_down';

export class DeviceFlowSignal extends Error {
  constructor(
    public readonly code: DeviceFlowSignalCode,
    /** For `slow_down`: seconds GitHub wants us to back off by. */
    public readonly intervalSeconds?: number
  ) {
    super(code);
    this.name = 'DeviceFlowSignal';
  }
}
