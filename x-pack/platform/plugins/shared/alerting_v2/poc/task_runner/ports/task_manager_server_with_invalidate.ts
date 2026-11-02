/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pod-build port: same re-exports as `task_manager_server.ts`, plus `runInvalidate` — redirected
 * to only from Alerting v2's own `invalidate_pending_api_keys` task (see `build.mjs`), since that
 * one export pulls Core's HTTP router internals, APM and OpenTelemetry into the bundle.
 */
export * from './task_manager_server';
export { runInvalidate } from '../../../../task_manager/server/invalidate_api_keys/lib/run_invalidate';
