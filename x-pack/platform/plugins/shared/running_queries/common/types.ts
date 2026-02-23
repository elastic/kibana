/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type QueryType = 'ES|QL' | 'DSL' | 'Other';

export interface RunningQuery {
  taskId: string;
  queryType: QueryType;
  source: string;
  startTime: number;
  indices: number;
  remoteSearch?: string;
  query: string;
  traceId?: string;
  cancellable: boolean;
  cancelled: boolean;
}
