/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOOKBACK_WINDOW_MINUTES = 10;

/**
 * Task manager task type and singleton task id used to schedule dispatcher
 * ticks.
 *
 * Kept in a pure-constants module so consumers that only need the identifiers
 * (e.g. test helpers polling the task manager / event log) can import them
 * without pulling in `task_runner.ts`, which uses inversify decorators that
 * not every transpiler in the repo supports.
 */
export const DISPATCHER_TASK_TYPE = 'alerting_v2:dispatcher' as const;
export const DISPATCHER_TASK_ID = 'alerting_v2:dispatcher:1.0.0' as const;
