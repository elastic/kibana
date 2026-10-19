/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Transport = 'thread' | 'process';
export type WorkloadClass = 'alerting' | 'workflow' | 'agent';
export type Fixture = 'spin' | 'infinite' | 'wait' | 'stale_first' | 'bytes';

export interface RunCommand {
  readonly kind: 'run';
  readonly generation: number;
  readonly fixture: Fixture;
  readonly durationMs: number;
  readonly bytes: number;
}

export interface ReadyMessage {
  readonly kind: 'ready';
  readonly heapUsed: number;
  readonly rss: number;
}

export interface ResultMessage {
  readonly kind: 'result';
  readonly generation: number;
  readonly durationMs: number;
  readonly consumedBytes: number;
  readonly heapUsed: number;
}

export type ExecutorMessage = ReadyMessage | ResultMessage;
