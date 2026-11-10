/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorSource, TaskErrorSource } from '@kbn/task-manager-plugin/server/task_running';

/**
 * Who a failure is attributed to. `user` is a failure caused by the rule's own
 * configuration or query (for example an invalid ES|QL query), `framework` is
 * everything else, matching the Task Manager error source.
 */
export type ErrorSource = 'user' | 'framework';

/**
 * Resolves the source from the error source Task Manager already holds for the
 * error, so the label always agrees with the `user_errors` and
 * `framework_errors` counters. An error is `user` only when the code that threw
 * it tagged it as a user error with `createTaskRunError`.
 */
export const resolveErrorSource = (error: unknown): ErrorSource =>
  error instanceof Error && getErrorSource(error) === TaskErrorSource.USER ? 'user' : 'framework';
