/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/datastreams/alert_events';
import { guardedMapStep } from '../stream_utils';

interface ActiveEpisodeCountRow {
  active_count: number;
}

@injectable()
export class CountActiveEpisodesStep implements RuleExecutionStep {
  public readonly name = 'count_active_episodes';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return guardedMapStep(streamState, ['rule'], async (state) => {
      const { ruleId } = state.input;

      this.logger.debug({
        message: `[${this.name}] Counting active episodes for rule ${ruleId}`,
      });

      const activeCount = await this.getActiveEpisodeCount(
        ruleId,
        state.input.executionContext.signal
      );

      this.logger.debug({
        message: `[${this.name}] Active episode count for rule ${ruleId}: ${activeCount}`,
      });

      return {
        type: 'continue',
        state: { ...state, activeEpisodeCount: activeCount },
      };
    });
  }

  private async getActiveEpisodeCount(ruleId: string, abortSignal: AbortSignal): Promise<number> {
    try {
      const rows = await this.queryService.executeQueryRows<ActiveEpisodeCountRow>({
        query: `FROM ${ALERT_EVENTS_DATA_STREAM}
          | WHERE rule.id == ?
            AND type == "alert"
            AND episode.status IN ("pending", "active")
          | STATS active_count = COUNT_DISTINCT(episode.id)`,
        params: [ruleId],
        abortSignal,
      });

      return rows[0]?.active_count ?? 0;
    } catch (error) {
      this.logger.error({
        error,
        code: 'ACTIVE_EPISODE_COUNT_ERROR',
        type: 'CountActiveEpisodesStepError',
      });

      return 0;
    }
  }
}
