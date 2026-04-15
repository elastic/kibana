/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** How often (ms) the abort monitor polls the execution status to detect abort requests. */
export const ABORT_POLL_INTERVAL_MS = 2000;

/** How often (ms) followExecution polls for new events. */
export const FOLLOW_POLL_INTERVAL_MS = 500;

/** How often (ms) execution events are batched before being written to ES. */
export const EVENT_BATCH_INTERVAL_MS = 200;

/**
 * Max number of retries when reading remaining events after a terminal execution status.
 * ES near-real-time indexing may not make events searchable immediately after they are written.
 */
export const FOLLOW_TERMINAL_READ_MAX_RETRIES = 2;

/** Delay (ms) between retries when reading remaining events after terminal status. */
export const FOLLOW_TERMINAL_READ_RETRY_DELAY_MS = 500;

/** Safety timeout (ms) for followExecution polling. Prevents infinite polling if the execution never reaches a terminal status. */
export const FOLLOW_EXECUTION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

/** Idle timeout (ms) for followExecution polling. If no new events are received and the execution status hasn't changed for this duration, polling is aborted. */
export const FOLLOW_EXECUTION_IDLE_TIMEOUT_MS = 120 * 1000; // 2 minutes
