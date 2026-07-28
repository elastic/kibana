/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { registerTagMergeTaskType } from './register';
export { getTagMergeTaskId, TAG_MERGE_TASK_TYPE } from './constants';
export { initialTagMergeTaskState } from './schemas';
export type { TagMergeTaskParams, TagMergeTaskState } from './schemas';
