/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Task manager task type used to schedule rule executor ticks.
 *
 * Kept in a pure-constants module so consumers that only need the identifier
 * (e.g. test helpers polling the task manager / event log) can import it
 * without pulling in `task_runner.ts`, which uses inversify decorators that
 * not every transpiler in the repo supports.
 */
export const ALERTING_RULE_EXECUTOR_TASK_TYPE = 'alerting_v2:rule_executor' as const;
