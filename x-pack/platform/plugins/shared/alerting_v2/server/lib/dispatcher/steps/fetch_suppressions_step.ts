/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { ESQL_QUERY_ROW_LIMIT, getAlertEpisodeSuppressionsQueries } from '../queries';
import { EpisodeScan, SuppressionIndex } from '../state';
import type {
  AlertEpisodeSuppression,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
} from '../types';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';

@injectable()
export class FetchSuppressionsStep implements DispatcherStep {
  public readonly name = 'fetch_suppressions';

  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    logger: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const { scan = EpisodeScan.empty() } = state;
    if (scan.isEmpty()) {
      return { type: 'continue', data: { suppressions: SuppressionIndex.empty() } };
    }

    const { signal } = state.input;

    const queries = getAlertEpisodeSuppressionsQueries(scan.episodes);
    const responses = await Promise.all(
      queries.map((request) =>
        this.queryService.executeQueryRows<AlertEpisodeSuppression>({
          query: request.query,
          abortSignal: signal,
        })
      )
    );

    // Chunks are keyed by series but return one row per episode, so the literal
    // cap cannot bound the row count; a full chunk may have dropped rows.
    const truncatedChunks = responses.filter((rows) => rows.length >= ESQL_QUERY_ROW_LIMIT).length;
    if (truncatedChunks > 0) {
      logger.warn({
        code: ALERTING_LOG_CODES.FETCH_SUPPRESSIONS_STEP_ROW_LIMIT_REACHED,
        message: () =>
          `${truncatedChunks} of ${responses.length} suppressions queries returned ` +
          `${ESQL_QUERY_ROW_LIMIT} rows; suppressions past the limit were dropped`,
      });
    }

    const suppressions = responses.flat();

    return { type: 'continue', data: { suppressions: SuppressionIndex.of(suppressions) } };
  }
}
