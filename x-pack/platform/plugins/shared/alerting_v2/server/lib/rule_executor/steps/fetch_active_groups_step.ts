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
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { ConfigService } from '../../services/config_service/config_service';

/**
 * Fetches the rule's currently-active group hashes once, before the breach query
 * fans out into batches, and threads them onto `state.activeGroups`.
 *
 * The set is reused downstream by `CreateAlertEventsStep` and `ClassifyAbsentGroupsStep`.
 */
@injectable()
export class FetchActiveGroupsStep implements RuleExecutionStep {
  public readonly name = 'fetch_active_groups';

  /** Active-group fetch bound, tied to `alerts.max` so recovery sees every existing episode. */
  private readonly maxActiveGroups: number;

  constructor(
    @inject(QueryServiceInternalToken) private readonly internalQueryService: QueryServiceContract,
    @inject(ConfigService) configService: ConfigService
  ) {
    this.maxActiveGroups = configService.get('rules.run.alerts.max');
  }

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedMapStep(streamState, ['rule'], async (state) => {
      if (state.rule.kind !== 'alert') {
        return { type: 'continue', state };
      }

      const logger = state.logger.withLabels({ step: step.name });
      const activeGroups = await fetchActiveAlertGroupHashes({
        queryService: step.internalQueryService,
        ruleId: state.input.ruleId,
        executionContext: state.input.executionContext,
        limit: step.maxActiveGroups,
        logger,
      });

      if (activeGroups.length >= step.maxActiveGroups) {
        logger.warn({
          message: () =>
            `Active-group fetch hit the alerts.max bound (${step.maxActiveGroups}), active set may be truncated`,
          code: ALERTING_LOG_CODES.RULE_EXECUTION_ACTIVE_GROUPS_TRUNCATED,
        });
      }

      logger.debug({ message: () => `Fetched ${activeGroups.length} active groups` });

      return { type: 'continue', state: { ...state, activeGroups } };
    });
  }
}
