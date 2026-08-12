/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { guardedMapStep } from '../stream_utils';
import { fetchActiveAlertGroupHashes } from '../fetch_active_alert_group_hashes';
import { isClassifyAbsentGroupsEnabled } from '../is_classify_absent_groups_enabled';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import type { QueryServiceContract } from '../../services/query_service/query_service';

/**
 * Fetches the rule's currently-active group hashes once, before the breach query
 * fans out into batches, and threads them onto `state.activeGroups`.
 *
 * The set is reused downstream by `CreateAlertEventsStep` and `ClassifyAbsentGroupsStep`. It
 * only matters when the run may classify absence, so the query is skipped otherwise.
 */
@injectable()
export class FetchActiveGroupsStep implements RuleExecutionStep {
  public readonly name = 'fetch_active_groups';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryServiceInternalToken) private readonly internalQueryService: QueryServiceContract
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedMapStep(streamState, ['rule'], async (state) => {
      if (!isClassifyAbsentGroupsEnabled(state.rule)) {
        return { type: 'continue', state };
      }

      const activeGroups = await fetchActiveAlertGroupHashes(
        step.internalQueryService,
        state.input.ruleId,
        state.input.executionContext
      );

      step.logger.debug({
        message: `[${step.name}] Fetched ${activeGroups.length} active group(s) for rule ${state.input.ruleId}`,
      });

      return { type: 'continue', state: { ...state, activeGroups } };
    });
  }
}
