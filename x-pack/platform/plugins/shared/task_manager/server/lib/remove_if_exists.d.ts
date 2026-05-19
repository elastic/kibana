/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskStore } from '../task_store';
/**
 * Removes a task from the store, ignoring a not found error
 * Other errors are re-thrown
 *
 * @param taskStore
 * @param taskId
 */
export declare function removeIfExists(taskStore: TaskStore, taskId: string): Promise<void>;
