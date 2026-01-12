/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ToolHealthStatus, ToolHealthState } from '../../../../../common/http_api/tools';
import type { ToolHealthProperties } from './storage';

export type ToolHealthDocument = SearchHit<ToolHealthProperties>;

// Re-export from common for convenience within the server
export type { ToolHealthStatus, ToolHealthState };

// Server-only types
export interface ToolHealthUpdateParams {
  status: ToolHealthStatus;
  lastCheck?: string;
  errorMessage?: string;
  consecutiveFailures?: number;
}
