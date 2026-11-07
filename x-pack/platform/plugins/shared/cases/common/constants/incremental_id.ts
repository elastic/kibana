/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_TASK_INTERVAL_MINUTES = 10;
export const DEFAULT_TASK_START_DELAY_MINUTES = 10;

/**
 * How long a case waits for its incremental ID to trigger `cases.caseUpdated`. Task
 * Manager has no TTL for tasks, so this also bounds the lifetime of the per-case trigger task (and
 * of the API key it holds). Cases older than this never get a trigger task.
 */
export const INCREMENTAL_ID_ASSIGNED_TRIGGER_TTL_MS = 24 * 60 * 60 * 1000;
