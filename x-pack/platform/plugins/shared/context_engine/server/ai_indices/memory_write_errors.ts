/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type MemoryWriteErrorCode =
  | 'memory_disabled'
  | 'ai_index_memory_disabled'
  | 'destination_not_writable'
  | 'memory_not_found'
  | 'duplicate_memory'
  | 'not_a_memory'
  | 'memory_type_mismatch'
  | 'memory_deleted'
  | 'missing_concurrency_metadata';

export class MemoryWriteError extends Error {
  constructor(public readonly code: MemoryWriteErrorCode, message: string) {
    super(message);
    this.name = 'MemoryWriteError';
  }
}
