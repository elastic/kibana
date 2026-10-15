/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryType } from '../memory';

export type { MemoryType } from '../memory';

export interface WriteMemoryRequest {
  type: MemoryType;
  title: string;
  description: string;
  content: string;
  tags?: string[];
  expires_at?: string | null;
  session_id?: string;
}

export interface ReviseMemoryRequest {
  type?: MemoryType;
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  expires_at?: string | null;
  session_id?: string;
}

export interface WriteMemoryResponse {
  id: string;
  session_id: string;
}

export interface DeleteMemoryResponse {
  id: string;
}
