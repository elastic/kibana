/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { getAlertEpisodeSuppressionsQuery } from '../queries';
import type {
  AlertEpisodeSuppression,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
} from '../types';

@injectable()
export class FetchSuppressionsStep implements DispatcherStep {
  public readonly name = 'fetch_suppressions';

  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { episodes } = state;
    if (!episodes || episodes.length === 0) {
      return { type: 'continue', data: { suppressions: [] } };
    }

    const suppressions = await this.queryService.executeQueryRows<AlertEpisodeSuppression>({
      query: getAlertEpisodeSuppressionsQuery(episodes).query,
    });

    return { type: 'continue', data: { suppressions } };
  }
}
