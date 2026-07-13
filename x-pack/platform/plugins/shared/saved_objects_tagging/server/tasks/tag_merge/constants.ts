/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TAG_MERGE_TASK_TYPE = 'saved_objects_tagging:tag_merge';

/** Number of referencing objects rewritten per `updating`-phase run. */
export const TAG_MERGE_BATCH_SIZE = 100;

/** Cap on retained sample error messages in the job's error summary. */
export const TAG_MERGE_MAX_ERROR_SAMPLES = 20;

/** Delay before a self-rescheduled run, to avoid monopolizing a Task Manager capacity slot. */
export const TAG_MERGE_RESCHEDULE_DELAY_MS = 3000;

/**
 * Deterministic id, unique per space: enforces "at most one merge job per space" since
 * scheduling a task at an id that already exists conflicts (the `task` saved object type is
 * namespace-agnostic, so the space must be encoded directly in the id).
 */
export const getTagMergeTaskId = (spaceId: string) => `${TAG_MERGE_TASK_TYPE}:${spaceId}`;
