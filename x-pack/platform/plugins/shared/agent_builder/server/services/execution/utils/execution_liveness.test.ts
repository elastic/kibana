/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/agent-builder-common';
import { isExecutionLive } from './execution_liveness';

describe('isExecutionLive', () => {
  const now = Date.parse('2026-01-01T12:00:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('is not live for a missing execution', () => {
    expect(isExecutionLive(undefined, now)).toBe(false);
  });

  it.each([ExecutionStatus.completed, ExecutionStatus.failed, ExecutionStatus.aborted])(
    'is not live when %s, even with a fresh heartbeat',
    (status) => {
      expect(isExecutionLive({ status, lastHeartbeat: ago(1000) }, now)).toBe(false);
    }
  );

  it('treats a running execution as live only within the heartbeat timeout', () => {
    const status = ExecutionStatus.running;
    expect(isExecutionLive({ status, lastHeartbeat: ago(59_000) }, now)).toBe(true);
    expect(isExecutionLive({ status, lastHeartbeat: ago(61_000) }, now)).toBe(false);
  });

  it('treats a scheduled execution as live only within the scheduled timeout', () => {
    const status = ExecutionStatus.scheduled;
    expect(isExecutionLive({ status, lastHeartbeat: ago(4 * 60_000) }, now)).toBe(true);
    expect(isExecutionLive({ status, lastHeartbeat: ago(6 * 60_000) }, now)).toBe(false);
  });

  it('is not live without a heartbeat', () => {
    expect(isExecutionLive({ status: ExecutionStatus.running }, now)).toBe(false);
  });

  it('defaults now to the current time', () => {
    const lastHeartbeat = new Date().toISOString();
    expect(isExecutionLive({ status: ExecutionStatus.running, lastHeartbeat })).toBe(true);
  });
});
