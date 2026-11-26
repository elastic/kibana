/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as generateUuid } from 'uuid';
import type {
  LogSearchResult,
  LogsRepository,
  SearchLogsParams,
  WorkflowLogEvent,
} from '../../server/repositories/logs_repository';

export class LogsRepositoryMock implements Required<LogsRepository> {
  public logs = new Map<string, WorkflowLogEvent>();

  public initialize(): Promise<void> {
    return Promise.resolve();
  }
  public createLogs(logEvents: WorkflowLogEvent[]): Promise<void> {
    logEvents.forEach((event) => {
      this.logs.set(generateUuid(), event);
    });
    return Promise.resolve();
  }

  public getRecentLogs(limit?: number): Promise<LogSearchResult> {
    const logs = Array.from(this.logs.values()).slice(0, limit);
    return Promise.resolve({
      total: logs.length,
      logs,
    });
  }

  public searchLogs(params: SearchLogsParams): Promise<LogSearchResult> {
    const logs = Array.from(this.logs.values()).filter((log) => {
      return true;
    });
    return Promise.resolve({
      total: logs.length,
      logs,
    });
  }
}
