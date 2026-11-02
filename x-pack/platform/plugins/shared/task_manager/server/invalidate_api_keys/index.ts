/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `runInvalidate` on its own: it builds fake requests, which pulls in Core's HTTP internals, so it
 * isn't part of `task_helpers`. Tasks that need it import it from
 * `@kbn/task-manager-plugin/server/invalidate_api_keys`.
 */
export { runInvalidate } from './lib/run_invalidate';
