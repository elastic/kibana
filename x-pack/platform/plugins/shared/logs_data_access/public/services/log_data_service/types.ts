/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type LogDataStatus = 'available' | 'empty' | 'missing' | 'unknown';

export interface LogDataService {
  getStatus(): Promise<{ status: LogDataStatus; hasData: boolean }>;
}
