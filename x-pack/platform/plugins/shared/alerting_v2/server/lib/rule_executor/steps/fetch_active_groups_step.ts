/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { PluginInitializer } from '@kbn/core-di-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { guardedMapStep } from '../stream_utils';
import { fetchActiveAlertGroupHashes } from '../fetch_active_alert_group_hashes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { PluginConfig } from '../../../config';

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
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryServiceInternalToken) private readonly internalQueryService: QueryServiceContract,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    this.maxActiveGroups = pluginConfigAccessor.get<PluginConfig>().rules.run.alerts.max;
  }

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedMapStep(streamState, ['rule'], async (state) => {
      if (state.rule.kind !== 'alert') {
        return { type: 'continue', state };
      }

      const activeGroups = await fetchActiveAlertGroupHashes(
        step.internalQueryService,
        state.input.ruleId,
        state.input.executionContext,
        step.maxActiveGroups
      );

      if (activeGroups.length >= step.maxActiveGroups) {
        step.logger.warn({
          message: `[${step.name}] Active-group fetch hit alerts.max=${step.maxActiveGroups} for rule ${state.input.ruleId}; active set may be truncated`,
          code: ALERTING_LOG_CODES.RULE_EXECUTION_ACTIVE_GROUPS_TRUNCATED,
          labels: {
            rule_id: state.input.ruleId,
            space_id: state.input.spaceId,
            step: step.name,
          },
        });
      }

      step.logger.debug({
        message: `[${step.name}] Fetched ${activeGroups.length} active group(s) for rule ${state.input.ruleId}`,
      });

      return { type: 'continue', state: { ...state, activeGroups } };
    });
  }
}
