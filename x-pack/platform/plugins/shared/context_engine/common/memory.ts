/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MEMORY_KI_TYPES = ['memory.session', 'memory.session_fact'] as const;
export const DEFAULT_MEMORY_EXPIRATION_DAYS = 90;

export type MemoryType = (typeof MEMORY_KI_TYPES)[number];

export const isMemoryType = (value: string): value is MemoryType =>
  MEMORY_KI_TYPES.some((type) => type === value);
