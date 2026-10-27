/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * When modifying the field maps, ensure you perform upgrade testing for all graphs depending on this saver.
 */
export const checkpointsFieldMap = {
  '@timestamp': {
    type: 'date',
    required: true,
    array: false,
  },
  thread_id: { type: 'keyword', required: true, array: false },
  checkpoint_ns: { type: 'keyword', required: true, array: false },
  checkpoint_id: { type: 'keyword', required: false, array: false },
  parent_checkpoint_id: { type: 'keyword', required: true, array: false },
  type: { type: 'keyword', required: true, array: false },
  checkpoint: { type: 'binary', required: true, array: false },
  metadata: { type: 'binary', required: true, array: false },
} as const;

/**
 * When modifying the field maps, ensure you perform upgrade testing for all graphs depending on this saver.
 */
export const checkpointWritesFieldMap = {
  '@timestamp': {
    type: 'date',
    required: true,
    array: false,
  },
  thread_id: { type: 'keyword', required: true, array: false },
  checkpoint_ns: { type: 'keyword', required: true, array: false },
  checkpoint_id: { type: 'keyword', required: true, array: false },
  task_id: { type: 'keyword', required: true, array: false },
  idx: { type: 'unsigned_long', required: true, array: false },
  channel: { type: 'keyword', required: true, array: false },
  type: { type: 'keyword', required: true, array: false },
  value: { type: 'binary', required: true, array: false },
} as const;
