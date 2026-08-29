/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { getAlertEpisodeSuppressionsQueries } from '../queries';
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
    _: LoggerServiceContract
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
    const suppressions = responses.flat();

    return { type: 'continue', data: { suppressions: SuppressionIndex.of(suppressions) } };
  }
}
