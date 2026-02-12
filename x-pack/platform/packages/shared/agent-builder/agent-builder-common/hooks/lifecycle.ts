/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lifecycle events that can trigger hooks.
 *
 * Note: this is intentionally scoped to server-side agent execution lifecycle.
 */
export enum HookLifecycle {
  beforeAgent = 'beforeAgent',
  beforeToolCall = 'beforeToolCall',
  afterToolCall = 'afterToolCall',
}

/**
 * Determines when the hook is executed relative to the main agent execution flow.
 *
 * - blocking: executed before proceeding; errors abort the main agent execution.
 * - nonBlocking: executed in the background; errors are logged and do not abort.
 */
export enum HookExecutionMode {
  blocking = 'blocking',
  nonBlocking = 'nonBlocking',
}
