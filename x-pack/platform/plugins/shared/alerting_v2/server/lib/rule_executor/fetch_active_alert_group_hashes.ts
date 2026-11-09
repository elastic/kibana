/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryServiceContract } from '../services/query_service/query_service';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import type { ExecutionContext } from '../execution_context';
import { getActiveAlertGroupHashesQuery, type ActiveAlertGroupHash } from './queries';

export interface FetchActiveAlertGroupHashesParams {
  queryService: QueryServiceContract;
  ruleId: string;
  executionContext: ExecutionContext;
  limit: number;
  logger: LoggerServiceContract;
}

export async function fetchActiveAlertGroupHashes({
  queryService,
  ruleId,
  executionContext,
  limit,
  logger,
}: FetchActiveAlertGroupHashesParams): Promise<ActiveAlertGroupHash[]> {
  const request = getActiveAlertGroupHashesQuery({ ruleId, limit }).toRequest();
  return queryService.executeQueryRows<ActiveAlertGroupHash>({
    logger,
    query: request.query,
    // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
    params: request.params,
    // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
    filter: request.filter,
    abortSignal: executionContext.signal,
  });
}
